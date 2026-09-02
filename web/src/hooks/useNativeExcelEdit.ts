import { useState, useCallback, useEffect, useRef } from "react";
import { getFileBlob } from "@/api/file";
import { isElectron } from "@/utils/platform";
import { appMessage } from "@/utils/appMessage";
import { desktopArtifactOwnerKey } from "@/utils/desktopArtifact";

function sanitizeOpenFileName(fileName: string): string {
  const fallback = "template.xlsx";
  const baseName = String(fileName ?? "")
    .split(/[\\/]/)
    .pop()
    ?.trim() ?? "";
  const safeName = baseName.replace(/[<>:"/\\|?*]/g, "_");
  if (!safeName) return fallback;
  return /\.(xlsx|xlsm|xls)$/i.test(safeName) ? safeName : `${safeName}.xlsx`;
}

export interface NativeEditInfo {
  filePath: string;
  templateId: number;
  fileName: string;
  updatedAt?: string;
  expectedExcelFileId?: number | null;
  synced: boolean;
  syncing: boolean;
  uploadPercent: number | null;
  /**
   * 文件格式版本，用于判断是否可复用已打开文件：
   *   'hide-v6' = veryHidden + activeTab 修复 + definedNames 清理
   *   'none'    = 未做 sheet 处理
   */
  format: "hide-v6" | "none";
}

export interface UseNativeExcelEditOptions {
  onFileSync: (params: {
    templateId: number;
    fileName: string;
    updatedAt?: string;
    expectedExcelFileId?: number | null;
    file: File;
    onUploadProgress: (percent: number) => void;
  }) => Promise<{ updatedAt?: string; expectedExcelFileId?: number | null } | void>;
  /**
   * 仅保留给 Web 内嵌编辑器使用；原生 Excel 打开路径不再改写 xlsx 包体，
   * 避免复杂模板被 ZIP 层处理后触发 Excel「发现内容有问题」修复弹窗。
   */
  sheetsToStrip?: string[];
  /**
   * LIMS 本地目录子分类，如 '原始记录/证书内页模版' 或 '证书封面&说明页模版'。
   * 文件保存至：macOS ~/Downloads/lims/{category}/{timestamp}/{fileName}
   *             Windows D:\lims\{category}\{timestamp}\{fileName}；无 D 盘时使用 C:\lims
   */
  category?: string;
}

export function useNativeExcelEdit(options: UseNativeExcelEditOptions) {
  const isDesktopApp = isElectron();

  const [nativeEditInfo, setNativeEditInfo] = useState<NativeEditInfo | null>(null);
  const [nativeEditLoading, setNativeEditLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<number | null>(null);

  const nativeEditRef = useRef(nativeEditInfo);
  nativeEditRef.current = nativeEditInfo;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const syncingRef = useRef(false);
  const syncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExcelBuffer = useCallback(async (fileId: number): Promise<Uint8Array> => {
    const blob = await getFileBlob(fileId);
    return new Uint8Array(await blob.arrayBuffer());
  }, []);

  const openInDesktopApp = useCallback(
    async (
      buffer: Uint8Array,
      fileName: string,
      readOnly?: boolean,
      workspaceKey?: string,
    ): Promise<string> => {
      const category = optionsRef.current.category;
      if (category && window.electronAPI?.openFileInLimsDir) {
        return window.electronAPI.openFileInLimsDir(buffer, fileName, category, readOnly, workspaceKey);
      }
      return window.electronAPI!.openFileInSystemApp(buffer, fileName, readOnly);
    },
    [],
  );

  const handleNativeEdit = useCallback(async (fileId: number, fileName: string, templateId: number, updatedAt?: string) => {
    if (!window.electronAPI || !fileId) return;
    const prev = nativeEditRef.current;
    const sanitizedFileName = sanitizeOpenFileName(fileName);

    const expectedFormat: NativeEditInfo["format"] = "none";

    // 同一模版、格式版本一致 → 尝试复用已打开的 LIMS 目录文件
    if (prev && prev.templateId === templateId && prev.filePath && prev.format === expectedFormat) {
      try {
        const ok = await window.electronAPI.focusTempFile(prev.filePath);
        if (ok) return;
      } catch { /* 文件已失效，降级为重新下载 */ }
    }

    if (prev?.filePath) {
      window.electronAPI.pauseWatchingFile(prev.filePath);
      setNativeEditInfo(null);
    }
    setNativeEditLoading(true);
    setLoadingTemplateId(templateId);
    try {
      const ownerKey = desktopArtifactOwnerKey();
      const workspaceKey = `${ownerKey}:template:${optionsRef.current.category || "temporary"}:${templateId}`;
      const rawBuffer = await fetchExcelBuffer(fileId);
      const filePath = await openInDesktopApp(rawBuffer, sanitizedFileName, false, workspaceKey);

      await window.electronAPI.watchFileChanges(filePath, {
        key: workspaceKey,
        ownerKey,
        title: sanitizedFileName,
        serverRevision: updatedAt || String(fileId),
      });
      setNativeEditInfo({
        filePath,
        templateId,
        fileName: sanitizedFileName,
        updatedAt,
        expectedExcelFileId: fileId,
        synced: false,
        syncing: false,
        uploadPercent: null,
        format: "none",
      });
    } catch {
      appMessage().error("打开文件失败");
    } finally {
      setNativeEditLoading(false);
      setLoadingTemplateId(null);
    }
  }, [fetchExcelBuffer, openInDesktopApp]);

  const handleNativeView = useCallback(async (fileId: number, fileName: string) => {
    if (!window.electronAPI || !fileId) return;
    const sanitizedFileName = sanitizeOpenFileName(fileName);
    setViewLoading(true);
    try {
      const rawBuffer = await fetchExcelBuffer(fileId);
      await openInDesktopApp(rawBuffer, sanitizedFileName, true);
    } catch {
      appMessage().error("打开文件失败");
    } finally {
      setViewLoading(false);
    }
  }, [fetchExcelBuffer, openInDesktopApp]);

  const handleStopNativeEdit = useCallback(() => {
    if (syncedTimerRef.current) {
      clearTimeout(syncedTimerRef.current);
      syncedTimerRef.current = null;
    }
    const info = nativeEditRef.current;
    if (info?.filePath) {
      window.electronAPI?.stopWatchingFile(info.filePath);
    }
    setNativeEditInfo(null);
  }, []);

  const isEditing = !!nativeEditInfo;
  useEffect(() => {
    if (!window.electronAPI || !isEditing) return;

    const unsubscribe = window.electronAPI.onFileChanged(async (filePath, buffer) => {
      const info = nativeEditRef.current;
      if (!info || filePath !== info.filePath) return;
      if (syncingRef.current) return;

      syncingRef.current = true;
      if (syncedTimerRef.current) {
        clearTimeout(syncedTimerRef.current);
        syncedTimerRef.current = null;
      }
      setNativeEditInfo((prev) => (prev ? { ...prev, syncing: true, uploadPercent: 0 } : null));

      const watchedPath = info.filePath;
      try {
        const finalBuffer = new Uint8Array(buffer);
        const file = new File([finalBuffer], info.fileName, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const syncResult = await optionsRef.current.onFileSync({
          templateId: info.templateId,
          fileName: info.fileName,
          updatedAt: info.updatedAt,
          expectedExcelFileId: info.expectedExcelFileId,
          file,
          onUploadProgress: (percent) => {
            setNativeEditInfo((prev) =>
              prev && prev.filePath === watchedPath ? { ...prev, uploadPercent: percent } : prev,
            );
          },
        });
        await window.electronAPI?.markWorkspaceFileSynced?.(
          watchedPath,
          syncResult?.updatedAt ?? info.updatedAt ?? String(syncResult?.expectedExcelFileId ?? info.expectedExcelFileId ?? ""),
        ).catch(() => undefined);
        setNativeEditInfo((prev) => (prev ? {
          ...prev,
          updatedAt: syncResult?.updatedAt ?? prev.updatedAt,
          expectedExcelFileId: syncResult?.expectedExcelFileId ?? prev.expectedExcelFileId,
          synced: true,
          syncing: false,
          uploadPercent: null,
        } : null));

        if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
        syncedTimerRef.current = setTimeout(() => {
          setNativeEditInfo((prev) => (prev ? { ...prev, synced: false } : prev));
          syncedTimerRef.current = null;
        }, 2000);
      } catch {
        setNativeEditInfo((prev) => (prev ? { ...prev, syncing: false, uploadPercent: null } : null));
        appMessage().error("同步文件失败，请检查网络后重试");
      } finally {
        syncingRef.current = false;
      }
    });

    return () => { unsubscribe(); };
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
      const info = nativeEditRef.current;
      if (info?.filePath) {
        // 页面卸载只停监听，不删文件（LIMS 目录文件需永久保留）
        window.electronAPI?.pauseWatchingFile(info.filePath);
      }
    };
  }, []);

  return {
    isDesktopApp,
    nativeEditInfo,
    nativeEditLoading,
    viewLoading,
    loadingTemplateId,
    handleNativeEdit,
    handleNativeView,
    handleStopNativeEdit,
  };
}
