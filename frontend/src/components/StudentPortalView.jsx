import React, { useState, useEffect } from 'react';
import RoleBasedDashboardView from './dashboards/RoleBasedDashboardView';
import CertificateModal from './CertificateModal';
import StudentTicketModal from './StudentTicketModal';
import { getRouteParam, setRouteParam, removeRouteParam } from '../routes';

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
  const [ticketModalConfig, setTicketModalConfig] = useState(() => {
    try {
      const isSupportOpen = getRouteParam('support') === 'open' || Boolean(getRouteParam('ticket')) || sessionStorage.getItem('aaroha_student_support_open') === 'true';
      const initialTab = getRouteParam('support') === 'create' ? 'create' : 'my_tickets';
      const initialTicketId = getRouteParam('ticket') || sessionStorage.getItem('aaroha_student_selected_ticket_id') || null;
      return { isOpen: Boolean(isSupportOpen), initialTab, initialTicketId };
    } catch (e) {
      return { isOpen: false, initialTab: 'my_tickets', initialTicketId: null };
    }
  });

  const handleOpenTicketModal = (tab = 'my_tickets', ticketId = null) => {
    setTicketModalConfig({ isOpen: true, initialTab: tab || 'my_tickets', initialTicketId: ticketId || null });
    try {
      setRouteParam('support', tab === 'create' ? 'create' : 'open');
      if (ticketId) {
        setRouteParam('ticket', ticketId);
        sessionStorage.setItem('aaroha_student_selected_ticket_id', String(ticketId));
      }
      sessionStorage.setItem('aaroha_student_support_open', 'true');
    } catch (e) {}
  };

  const handleCloseTicketModal = () => {
    setTicketModalConfig(prev => ({ ...prev, isOpen: false, initialTicketId: null }));
    try {
      removeRouteParam('support');
      removeRouteParam('ticket');
      sessionStorage.removeItem('aaroha_student_support_open');
      sessionStorage.removeItem('aaroha_student_selected_ticket_id');
    } catch (e) {}
  };

  useEffect(() => {
    const handleSupportEvent = (e) => {
      const tab = e?.detail?.tab || 'my_tickets';
      const ticketId = e?.detail?.ticketId || null;
      handleOpenTicketModal(tab, ticketId);
    };
    window.addEventListener('aaroha:open-student-support', handleSupportEvent);
    return () => window.removeEventListener('aaroha:open-student-support', handleSupportEvent);
  }, []);

  return (
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Comprehensive Role-Based Student Dashboard */}
      <RoleBasedDashboardView
        currentUser={currentUser}
        onOpenCourse={onOpenCourse}
        onContinueLearning={onOpenCourse}
        onOpenClassroom={onOpenCourse}
        onOpenProfile={onOpenProfile}
        onOpenTicketModal={handleOpenTicketModal}
        onExploreCatalog={onExploreCatalog}
        onViewWebsite={onViewWebsite || onExploreCatalog}
      />

      {/* Support & Academic Ticket Modal */}
      <StudentTicketModal
        isOpen={ticketModalConfig.isOpen}
        onClose={handleCloseTicketModal}
        currentUser={currentUser}
        initialTab={ticketModalConfig.initialTab}
        initialTicketId={ticketModalConfig.initialTicketId}
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
