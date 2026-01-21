import { useState } from "react";
import { buildInviteLink } from "../lib/url";

type InviteLinkProps = {
  token: string;
};

const InviteLink = ({ token }: InviteLinkProps) => {
  const [copied, setCopied] = useState(false);
  const link = buildInviteLink(token);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="invite-link">
      <input type="text" readOnly value={link} />
      <button className="secondary-button" onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

export default InviteLink;
