import JSZip from "jszip";

/**
 * 移除 xlsx 中的外部源链接（externalReferences / externalLink），
 * 避免系统 Excel 打开时弹出"此工作簿包含到一个或多个可能不安全的外部源的链接"的警告。
 * 在 ZIP 层面直接操作，不经过 ExcelJS 加载-重写，保留原始文件的全部格式。
 */
export async function removeExternalLinks(
  buffer: Uint8Array,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(buffer);

  const wbXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!wbXml || !/<externalReferences/i.test(wbXml)) return buffer;

  zip.file(
    "xl/workbook.xml",
    wbXml.replace(/<externalReferences>[\s\S]*?<\/externalReferences>\s*/g, ""),
  );

  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (relsXml) {
    const extLinkRe = /<Relationship[^>]+Type="[^"]*externalLink[^"]*"[^>]*\/>/g;
    let m: RegExpExecArray | null;
    while ((m = extLinkRe.exec(relsXml)) !== null) {
      const tgt = /Target="([^"]+)"/.exec(m[0]);
      if (tgt?.[1]) {
        const full = tgt[1].startsWith("/") ? tgt[1].slice(1) : `xl/${tgt[1]}`;
        zip.remove(full);
        const rp = full.replace(/^(.+\/)([^/]+)$/, "$1_rels/$2.rels");
        if (zip.file(rp)) zip.remove(rp);
      }
    }
    zip.file(
      "xl/_rels/workbook.xml.rels",
      relsXml.replace(extLinkRe, ""),
    );
  }

  let ctXml = await zip.file("[Content_Types].xml")?.async("string");
  if (ctXml) {
    ctXml = ctXml.replace(
      /<Override[^>]+PartName="\/xl\/externalLinks\/[^"]*"[^>]*\/>\s*/g,
      "",
    );
    zip.file("[Content_Types].xml", ctXml);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/**
 * 调大 xlsx 内的 <workbookView/> 窗口尺寸，让 Excel/WPS 打开文件时启动窗口更大，
 * 缓解部分系统下默认窗口尺寸过小导致用户每次都要手动放大窗口的问题。
 *
 * - 单位为 1/20 point（OOXML 标准）。Excel/WPS 会按显示器尺寸自适应裁切，
 *   填一个偏大的值（默认相当于 ~1500x1000 dp）足以覆盖主流 1080p/2K 屏幕。
 * - 仅修改 xl/workbook.xml 的 <bookViews><workbookView/></bookViews> 一段，
 *   不触碰文件其余结构，最大限度避免 Excel「发现内容有问题」修复弹窗。
 * - 任意失败均回退原 buffer，绝不阻塞主流程。
 *
 * 注意：当前默认仅在「后端实时渲染、结构干净」的内页 Excel 路径上启用；
 *       对用户上传的复杂模板 xlsx，请保持原有「不改写包体」的策略。
 */
export async function enlargeWorkbookView(
  buffer: Uint8Array,
  windowWidth = 28800,
  windowHeight = 18000,
): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const wbXml = await zip.file("xl/workbook.xml")?.async("string");
    if (!wbXml) return buffer;

    const sizeAttrs = `xWindow="0" yWindow="0" windowWidth="${windowWidth}" windowHeight="${windowHeight}"`;

    let nextWbXml: string;
    if (/<workbookView\b/.test(wbXml)) {
      // 必须同时匹配两种合法形式，否则会留下孤儿闭合标签导致 Excel/WPS「内容有问题」修复弹窗：
      //   形式 A：<workbookView .../>                       （自闭合）
      //   形式 B：<workbookView ...></workbookView>          （配对，excelize OpenReader + Write 输出此形式）
      //   形式 C：<workbookView ...>...</workbookView>       （配对+子元素，OOXML 罕见但合法）
      //
      // 历史回归场景：lims-server `applyPostEditFieldPatch`（dc6243d）在 user_edited 路径上
      // 用 excelize 重写 xl/workbook.xml，把原本自闭合的 <workbookView/> 序列化为配对形式 B；
      // 旧正则 `/<workbookView\b([^/>]*)\/?>/` 只能匹配开始标签并替换为自闭合，但 `</workbookView>`
      // 闭合标签会被原样保留，最终产出非法 XML `<workbookView .../></workbookView>` 触发修复弹窗。
      //
      // 当前正则用 alternation 分别匹配形式 A（自闭合）与形式 B/C（配对，含可能的子元素），
      // 统一替换为自闭合形式；形式 C 的子元素会被丢弃，但 workbookView 极少带子元素，可接受。
      nextWbXml = wbXml.replace(
        /<workbookView\b([^>]*?)\/>|<workbookView\b([^>]*?)>[\s\S]*?<\/workbookView>/,
        (_match, attrsSelfClose: string | undefined, attrsPaired: string | undefined) => {
          const rawAttrs = attrsSelfClose ?? attrsPaired ?? "";
          const stripped = rawAttrs
            .replace(/\s+xWindow="[^"]*"/g, "")
            .replace(/\s+yWindow="[^"]*"/g, "")
            .replace(/\s+windowWidth="[^"]*"/g, "")
            .replace(/\s+windowHeight="[^"]*"/g, "")
            .trim();
          const prefix = stripped ? ` ${stripped}` : "";
          return `<workbookView${prefix} ${sizeAttrs}/>`;
        },
      );
    } else if (/<sheets\b/.test(wbXml)) {
      nextWbXml = wbXml.replace(
        /<sheets\b/,
        `<bookViews><workbookView ${sizeAttrs}/></bookViews><sheets`,
      );
    } else {
      return buffer;
    }

    if (nextWbXml === wbXml) return buffer;
    zip.file("xl/workbook.xml", nextWbXml);
    return await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });
  } catch {
    return buffer;
  }
}

/**
 * 从 Excel 文件 buffer 中删除指定名称的 sheet，返回处理后的 buffer。
 * 在 ZIP 层面直接操作（不经过 ExcelJS 加载-重写），保留原始文件格式，速度远快于 ExcelJS。
 */
export async function stripExcelSheets(
  buffer: Uint8Array,
  sheetsToRemove: string[],
): Promise<Uint8Array> {
  if (sheetsToRemove.length === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);

  const wbXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!wbXml || !relsXml) return buffer;

  const removeSet = new Set(sheetsToRemove);
  const rIdsToRemove: string[] = [];
  const sheetTagRe = /<sheet\s[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = sheetTagRe.exec(wbXml)) !== null) {
    const tag = m[0];
    const nameMatch = /name="([^"]+)"/.exec(tag);
    const rIdMatch = /r:id="([^"]+)"/.exec(tag);
    if (nameMatch && rIdMatch && removeSet.has(nameMatch[1]!)) {
      rIdsToRemove.push(rIdMatch[1]!);
    }
  }
  if (rIdsToRemove.length === 0) return buffer;

  let newWbXml = wbXml;
  for (const rId of rIdsToRemove) {
    newWbXml = newWbXml.replace(
      new RegExp(`<sheet[^>]+r:id="${rId}"[^>]*/?>\\s*`, "g"),
      "",
    );
  }
  zip.file("xl/workbook.xml", newWbXml);

  let newRelsXml = relsXml;
  const sheetPaths: string[] = [];
  for (const rId of rIdsToRemove) {
    const relRe = new RegExp(`<Relationship[^>]+Id="${rId}"[^>]+Target="([^"]+)"[^>]*/?>`, "g");
    const relMatch = relRe.exec(relsXml);
    if (relMatch?.[1]) {
      const target = relMatch[1];
      const fullPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      sheetPaths.push(fullPath);
    }
    newRelsXml = newRelsXml.replace(
      new RegExp(`<Relationship[^>]+Id="${rId}"[^>]*/?>\\s*`, "g"),
      "",
    );
  }
  zip.file("xl/_rels/workbook.xml.rels", newRelsXml);

  for (const sp of sheetPaths) {
    zip.remove(sp);
    const rp = sp.replace(/^(.+\/)([^/]+)$/, "$1_rels/$2.rels");
    if (zip.file(rp)) zip.remove(rp);
  }

  let ctXml = await zip.file("[Content_Types].xml")?.async("string");
  if (ctXml) {
    for (const sp of sheetPaths) {
      ctXml = ctXml.replace(
        new RegExp(`<Override[^>]+PartName="/${sp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/?>\\s*`, "g"),
        "",
      );
    }
    zip.file("[Content_Types].xml", ctXml);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** 封面+说明页模版编辑时需要隐藏的 sheet */
export const CERT_COVER_SHEETS_TO_REMOVE = ["校准结果", "原始记录"];

/** 原始记录/证书内页模版编辑时需要隐藏的 sheet */
export const ORIGINAL_RECORD_SHEETS_TO_REMOVE = ["封面", "校准说明"];

/**
 * 在 ZIP 层面将指定 sheet 设为 veryHidden（不可见但公式引用完整保留）。
 * 比永久删除更安全：跨 sheet 公式不会断裂，Excel 不会弹出「内容有问题」警告。
 *
 * 同时处理两个边缘情况：
 *  1. activeTab 修复：若活动 tab 指向被隐藏的 sheet，重置为首个可见 sheet，否则 Excel 报"内容有问题"
 *  2. definedNames 清理：移除指向 veryHidden sheet 的命名区域（如打印区域），避免 Excel 警告
 */
export async function hideExcelSheets(
  buffer: Uint8Array,
  sheetsToHide: string[],
): Promise<Uint8Array> {
  if (sheetsToHide.length === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  let wbXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!wbXml) return buffer;

  const hideSet = new Set(sheetsToHide);

  // 解析所有 sheet 及其顺序索引
  const sheets: Array<{ name: string; sheetId: string; rId: string; idx: number }> = [];
  const sheetTagRe = /<sheet\s[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = sheetTagRe.exec(wbXml)) !== null) {
    const tag = m[0];
    const nameMatch = /name="([^"]+)"/.exec(tag);
    const sheetIdMatch = /sheetId="([^"]+)"/.exec(tag);
    const rIdMatch = /r:id="([^"]+)"/.exec(tag);
    if (nameMatch && sheetIdMatch && rIdMatch) {
      sheets.push({ name: nameMatch[1]!, sheetId: sheetIdMatch[1]!, rId: rIdMatch[1]!, idx });
    }
    idx++;
  }

  // 1. 将目标 sheet 设为 veryHidden（移除已有 state 属性后重新设置）
  for (const sheet of sheets) {
    if (!hideSet.has(sheet.name)) continue;
    const escaped = sheet.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    wbXml = wbXml.replace(
      new RegExp(`(<sheet[^>]+name="${escaped}"[^>]*?)\\s+state="[^"]*"([^>]*/?>)`),
      "$1$2",
    );
    wbXml = wbXml.replace(
      new RegExp(`(<sheet[^>]+name="${escaped}"[^>]*?)(\\/?>)`),
      `$1 state="veryHidden"$2`,
    );
  }

  // 2. activeTab 修复：若活跃 tab 指向被隐藏的 sheet，移到首个可见 sheet
  const sheetViewsMatch = /<bookView[^>]+activeTab="(\d+)"/.exec(wbXml);
  if (sheetViewsMatch) {
    const activeIdx = parseInt(sheetViewsMatch[1]!);
    const activeSheet = sheets[activeIdx];
    if (activeSheet && hideSet.has(activeSheet.name)) {
      const firstVisible = sheets.find((s) => !hideSet.has(s.name));
      const newActiveIdx = firstVisible ? firstVisible.idx : 0;
      wbXml = wbXml.replace(/(<bookView[^>]+activeTab=)"(\d+)"/, `$1"${newActiveIdx}"`);
    }
  }

  // 3. definedNames 清理：移除指向 veryHidden sheet 的命名区域（如 _xlnm.Print_Area）
  const hiddenSheetIds = new Set(sheets.filter((s) => hideSet.has(s.name)).map((s) => s.sheetId));
  if (hiddenSheetIds.size > 0) {
    // localSheetId 是基于 sheets 顺序的 0-based 索引
    const hiddenLocalIds = new Set(
      sheets.filter((s) => hideSet.has(s.name)).map((s) => s.idx),
    );
    wbXml = wbXml.replace(
      /<definedName[^>]+localSheetId="(\d+)"[^>]*>[^<]*<\/definedName>\s*/g,
      (match, localId) => (hiddenLocalIds.has(parseInt(localId)) ? "" : match),
    );
  }

  zip.file("xl/workbook.xml", wbXml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/**
 * 将 hideExcelSheets 设置的 veryHidden 状态恢复为可见（移除 state 属性）。
 * 上传到服务器前调用，确保服务端存储的是完整文件。
 */
export async function unhideExcelSheets(
  buffer: Uint8Array,
  sheetsToUnhide: string[],
): Promise<Uint8Array> {
  if (sheetsToUnhide.length === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  let wbXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!wbXml) return buffer;

  const unhideSet = new Set(sheetsToUnhide);

  // 移除目标 sheet 的 state 属性（veryHidden → 正常可见）
  wbXml = wbXml.replace(/<sheet\s[^>]*\/?>/g, (tag) => {
    const nameMatch = /name="([^"]+)"/.exec(tag);
    if (nameMatch && unhideSet.has(nameMatch[1]!)) {
      return tag.replace(/\s+state="[^"]*"/, "");
    }
    return tag;
  });

  zip.file("xl/workbook.xml", wbXml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
