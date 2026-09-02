import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

export const DEFAULT_DATA_COLUMN_WIDTH_PX = 112;
export const MIN_RESIZABLE_COLUMN_WIDTH_PX = 48;

type ActiveResize = {
  columnId: string;
  startX: number;
  startWidth: number;
};

export function useDataTableColumnResize() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const activeResizeRef = useRef<ActiveResize | null>(null);
  const originalCursorRef = useRef<string | null>(null);
  const originalUserSelectRef = useRef<string | null>(null);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const nextWidth = Math.max(
      MIN_RESIZABLE_COLUMN_WIDTH_PX,
      Math.round(width),
    );
    setColumnWidths((current) => {
      if (current[columnId] === nextWidth) return current;
      return { ...current, [columnId]: nextWidth };
    });
  }, []);

  const getColumnWidth = useCallback(
    (columnId: string, baseWidth: number) =>
      columnWidths[columnId] ?? baseWidth,
    [columnWidths],
  );

  const resizeColumnByDelta = useCallback(
    (columnId: string, currentWidth: number, delta: number) => {
      setColumnWidth(columnId, currentWidth + delta);
    },
    [setColumnWidth],
  );

  const startColumnResize = useCallback(
    (
      columnId: string,
      currentWidth: number,
      event: ReactMouseEvent<HTMLElement>,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      activeResizeRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: currentWidth,
      };

      originalCursorRef.current = document.body.style.cursor;
      originalUserSelectRef.current = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    const stopColumnResize = () => {
      activeResizeRef.current = null;
      if (originalCursorRef.current != null) {
        document.body.style.cursor = originalCursorRef.current;
        originalCursorRef.current = null;
      }
      if (originalUserSelectRef.current != null) {
        document.body.style.userSelect = originalUserSelectRef.current;
        originalUserSelectRef.current = null;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const activeResize = activeResizeRef.current;
      if (!activeResize) return;
      setColumnWidth(
        activeResize.columnId,
        activeResize.startWidth + event.clientX - activeResize.startX,
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopColumnResize);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopColumnResize);
      stopColumnResize();
    };
  }, [setColumnWidth]);

  return {
    getColumnWidth,
    resizeColumnByDelta,
    startColumnResize,
  };
}
