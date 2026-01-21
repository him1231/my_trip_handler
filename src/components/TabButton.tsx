type TabButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const TabButton = ({ label, active, onClick }: TabButtonProps) => {
  return (
    <button className={active ? "primary-button" : "secondary-button"} onClick={onClick}>
      {label}
    </button>
  );
};

export default TabButton;
