import React, { useState } from 'react';
import RoleBasedDashboardView from './dashboards/RoleBasedDashboardView';
import CertificateModal from './CertificateModal';
import StudentTicketModal from './StudentTicketModal';

export default function StudentPortalView({
  courses = [],
  enrollments = [],
  lessonProgress = [],
  taskSubmissions = [],
  certificates = [],
  onOpenCourse,
  onExploreCatalog,
  onOpenProfile,
  currentUser,
  onViewWebsite,
  showToast
}) {
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  return (
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Comprehensive Role-Based Student Dashboard */}
      <RoleBasedDashboardView
        currentUser={currentUser}
        onOpenCourse={onOpenCourse}
        onContinueLearning={onOpenCourse}
        onOpenClassroom={onOpenCourse}
        onOpenProfile={onOpenProfile}
        onOpenTicketModal={() => setIsTicketModalOpen(true)}
        onExploreCatalog={onExploreCatalog}
        onViewWebsite={onViewWebsite || onExploreCatalog}
      />

      {/* Support & Academic Ticket Modal */}
      <StudentTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        currentUser={currentUser}
        onSuccess={(msg) => {
          if (showToast) showToast(msg);
        }}
      />

      {/* Digital Certificate Viewer Modal */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
}
