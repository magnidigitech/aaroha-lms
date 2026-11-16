import React, { useState } from 'react';
import RoleBasedDashboardView from './dashboards/RoleBasedDashboardView';
import CertificateModal from './CertificateModal';

export default function StudentPortalView({
  courses = [],
  enrollments = [],
  lessonProgress = [],
  taskSubmissions = [],
  certificates = [],
  onOpenCourse,
  onExploreCatalog,
  onOpenProfile,
  currentUser
}) {
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  return (
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Comprehensive Role-Based Student Dashboard */}
      <RoleBasedDashboardView
        currentUser={currentUser}
        onOpenCourse={onOpenCourse}
        onContinueLearning={onOpenCourse}
        onOpenClassroom={onOpenCourse}
        onOpenProfile={onOpenProfile}
        onExploreCatalog={onExploreCatalog}
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
