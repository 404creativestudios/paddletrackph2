import { useNavigate } from "react-router-dom";

interface FloatingActionButtonProps {
  onClick?: () => void;
  icon?: string;
  href?: string;
}

export default function FloatingActionButton({ onClick, icon = "add", href }: FloatingActionButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <button
        onClick={handleClick}
        className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </button>
    </div>
  );
}
