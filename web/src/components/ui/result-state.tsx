import { Button } from "./button";
export function ResultState({
  title,
  description,
  actionText,
  onAction,
  actions,
}: {
  status?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-gray-500">{description}</p>
      ) : null}
      {actions ??
        (actionText ? <Button onClick={onAction}>{actionText}</Button> : null)}
    </div>
  );
}
