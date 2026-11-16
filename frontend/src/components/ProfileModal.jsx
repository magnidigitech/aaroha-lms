import React from 'react';
import ProfileSettingsModal from './dashboards/ProfileSettingsModal';

export default function ProfileModal(props) {
  return (
    <ProfileSettingsModal
      {...props}
      onSaveSuccess={(updatedUser) => {
        if (props.onSaveProfile) props.onSaveProfile(updatedUser);
      }}
    />
  );
}
