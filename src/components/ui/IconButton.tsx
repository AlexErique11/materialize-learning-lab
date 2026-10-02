import { Button, type ButtonProps } from './Button';

interface IconButtonProps extends ButtonProps {
  label: string;
}

export function IconButton({ label, className = '', ...props }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
    />
  );
}
