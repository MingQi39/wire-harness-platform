import {
  useCallback,
  useRef,
  type MouseEventHandler,
  type PointerEventHandler,
} from "react";

const DEFAULT_IGNORE_SELECTOR = [
  "button",
  "input",
  "textarea",
  "select",
  "a",
  "[role='button']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='separator']",
  "[data-drag-scroll-ignore='true']",
].join(",");

type DragScrollAxis = "x" | "y" | "both";

type DragScrollOptions = {
  enabled?: boolean;
  axis?: DragScrollAxis;
  threshold?: number;
  ignoreSelector?: string;
};

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
  canScrollX: boolean;
  canScrollY: boolean;
  didDrag: boolean;
};

const idleDragState: DragState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  scrollLeft: 0,
  scrollTop: 0,
  canScrollX: false,
  canScrollY: false,
  didDrag: false,
};

function hasScrollableOverflow(
  element: HTMLElement,
  axis: DragScrollAxis,
) {
  const canScrollX =
    axis !== "y" && element.scrollWidth > element.clientWidth + 1;
  const canScrollY =
    axis !== "x" && element.scrollHeight > element.clientHeight + 1;
  return { canScrollX, canScrollY };
}

function shouldIgnoreDragStart(
  target: EventTarget | null,
  currentTarget: HTMLElement,
  selector: string,
) {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(selector);
  return interactive != null && currentTarget.contains(interactive);
}

export function useDragScroll<T extends HTMLElement>({
  enabled = true,
  axis = "both",
  threshold = 4,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
}: DragScrollOptions = {}) {
  const dragStateRef = useRef<DragState>(idleDragState);
  const suppressClickRef = useRef(false);

  const resetDragState = useCallback(() => {
    dragStateRef.current = idleDragState;
  }, []);

  const onPointerDown = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (!enabled || event.button !== 0 || event.pointerType !== "mouse") {
        return;
      }
      if (
        shouldIgnoreDragStart(
          event.target,
          event.currentTarget,
          ignoreSelector,
        )
      ) {
        return;
      }

      const { canScrollX, canScrollY } = hasScrollableOverflow(
        event.currentTarget,
        axis,
      );
      if (!canScrollX && !canScrollY) return;

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: event.currentTarget.scrollLeft,
        scrollTop: event.currentTarget.scrollTop,
        canScrollX,
        canScrollY,
        didDrag: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [axis, enabled, ignoreSelector],
  );

  const onPointerMove = useCallback<PointerEventHandler<T>>(
    (event) => {
      const state = dragStateRef.current;
      if (state.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      if (!state.didDrag && Math.hypot(deltaX, deltaY) < threshold) {
        return;
      }

      state.didDrag = true;
      suppressClickRef.current = true;
      if (state.canScrollX) {
        event.currentTarget.scrollLeft = state.scrollLeft - deltaX;
      }
      if (state.canScrollY) {
        event.currentTarget.scrollTop = state.scrollTop - deltaY;
      }
      event.preventDefault();
    },
    [threshold],
  );

  const onPointerUp = useCallback<PointerEventHandler<T>>(
    (event) => {
      const state = dragStateRef.current;
      if (state.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      resetDragState();
      if (state.didDrag) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    },
    [resetDragState],
  );

  const onPointerCancel = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (dragStateRef.current.pointerId === event.pointerId) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
      resetDragState();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [resetDragState],
  );

  const onClickCapture = useCallback<MouseEventHandler<T>>((event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  };
}
