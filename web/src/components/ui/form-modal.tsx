import { Modal, type ModalProps } from "./app-ui";
import { cn } from "@/lib/utils";

export const FORM_MODAL_WIDTH = {
  sm: 640,
  md: 800,
  lg: 960,
  xl: 1120,
} as const;

export type FormModalSize = keyof typeof FORM_MODAL_WIDTH;

export const FORM_MODAL_FORM_CLASS = "w-full min-w-0";
export const FORM_MODAL_GUTTER: [number, number] = [16, 8];

export type FormModalProps = ModalProps & {
  size?: FormModalSize;
};

export function FormModal({
  size = "md",
  width,
  okText = "保存",
  cancelText = "取消",
  className,
  bodyClassName,
  styles,
  ...props
}: FormModalProps) {
  return (
    <Modal
      {...props}
      width={width ?? FORM_MODAL_WIDTH[size]}
      okText={okText}
      cancelText={cancelText}
      scrollable={false}
      className={cn("flex flex-col", className)}
      bodyClassName={cn("mt-3 min-h-0 flex-1", bodyClassName)}
      styles={styles}
    />
  );
}
