import { Button } from "./ui/button";

type TabButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const TabButton = ({ label, active, onClick }: TabButtonProps) => {
  return (
    <Button variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
};

export default TabButton;
