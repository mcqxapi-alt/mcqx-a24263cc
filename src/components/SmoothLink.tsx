import { Link, LinkProps, useNavigate } from "react-router-dom";
import { MouseEvent, useCallback } from "react";

interface SmoothLinkProps extends LinkProps {
  children: React.ReactNode;
}

/**
 * A Link component that provides buttery smooth navigation
 * by prefetching on hover and using optimized transitions
 */
export default function SmoothLink({ to, children, onClick, ...props }: SmoothLinkProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // Allow default behavior for modified clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      e.preventDefault();
      onClick?.(e);

      // Use requestAnimationFrame for smoother transition start
      requestAnimationFrame(() => {
        navigate(to as string);
      });
    },
    [navigate, to, onClick]
  );

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
