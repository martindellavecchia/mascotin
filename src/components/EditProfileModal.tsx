'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProfileForm from './ProfileForm';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  userId: string;
  onUpdate: () => void;
}

export default function EditProfileModal({ open, onOpenChange, profile, userId, onUpdate }: EditProfileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <ProfileForm 
          userId={userId} 
          initialData={profile} 
          onSuccess={onUpdate} 
        />
      </DialogContent>
    </Dialog>
  );
}
