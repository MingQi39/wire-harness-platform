import { cloneElement, isValidElement, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button, type ButtonProps } from "./button";

export function ConfirmButton({
  confirmText,
  title,
  description,
  onConfirm,
  children,
  ...props
}: ButtonProps & {
  confirmText?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const resolvedTitle = title ?? "确认执行？";
  const resolvedDescription = description ?? confirmText;

  const openDialog: React.MouseEventHandler<HTMLElement> = (event) => {
    props.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    if (event.defaultPrevented || pending || props.disabled) return;
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onConfirm?.();
      setOpen(false);
    } catch {
      // 请求层或调用方负责错误提示；弹窗保持打开，允许重试或取消。
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const trigger = isValidElement(children) ? (
    cloneElement(
      children as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { disabled?: boolean }
      >,
      {
        disabled:
          pending ||
          props.disabled ||
          (children as React.ReactElement<{ disabled?: boolean }>).props
            .disabled,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          (
            children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
          ).props.onClick?.(event);
          if (!event.defaultPrevented) openDialog(event);
        },
      },
    )
  ) : (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={openDialog as React.MouseEventHandler<HTMLButtonElement>}
    >
      {children}
    </Button>
  );

  return (
    <>
      {trigger}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
            <AlertDialogDescription
              className={resolvedDescription ? undefined : "sr-only"}
            >
              {resolvedDescription ?? "请确认是否继续当前操作。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {pending ? "处理中..." : "确定"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
