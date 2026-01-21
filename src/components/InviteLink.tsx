import { useState } from "react";
import { buildInviteLink } from "../lib/url";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
    <div className="flex flex-wrap items-center gap-2">
      <Input type="text" readOnly value={link} className="min-w-[240px]" />
      <Button variant="outline" onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
};

export default InviteLink;
