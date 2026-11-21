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
  const [ticketModalConfig, setTicketModalConfig] = useState({ isOpen: false, initialTab: 'my_tickets' });

  return (
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Comprehensive Role-Based Student Dashboard */}
      <RoleBasedDashboardView
        currentUser={currentUser}
        onOpenCourse={onOpenCourse}
        onContinueLearning={onOpenCourse}
        onOpenClassroom={onOpenCourse}
        onOpenProfile={onOpenProfile}
        onOpenTicketModal={(tab) => setTicketModalConfig({ isOpen: true, initialTab: tab || 'my_tickets' })}
        onExploreCatalog={onExploreCatalog}
        onViewWebsite={onViewWebsite || onExploreCatalog}
      />

      {/* Support & Academic Ticket Modal */}
      <StudentTicketModal
        isOpen={ticketModalConfig.isOpen}
        onClose={() => setTicketModalConfig(prev => ({ ...prev, isOpen: false }))}
        currentUser={currentUser}
        initialTab={ticketModalConfig.initialTab}
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
