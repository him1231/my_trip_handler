import InviteLink from "./InviteLink";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";

type ShareDialogProps = {
  inviteToken: string;
};

const ShareDialog = ({ inviteToken }: ShareDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Share</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this trip</DialogTitle>
          <DialogDescription>
            Anyone with the link can join as an editor. You can revoke access later.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <InviteLink token={inviteToken} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
