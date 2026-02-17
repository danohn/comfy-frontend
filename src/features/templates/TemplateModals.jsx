import React from 'react'
import TemplateDetailsModal from './TemplateDetailsModal'
import TemplatePrerequisitesModal from './TemplatePrerequisitesModal'

export default function TemplateModals({
  selectedTemplateDetails,
  selectedPrereqTemplate,
  selectedPrereqResult,
  onCloseDetails,
  onClosePrereq,
  onCopyModelUrl,
}) {
  return (
    <>
      <TemplateDetailsModal
        selectedTemplateDetails={selectedTemplateDetails}
        onCloseDetails={onCloseDetails}
      />
      <TemplatePrerequisitesModal
        selectedPrereqTemplate={selectedPrereqTemplate}
        selectedPrereqResult={selectedPrereqResult}
        onClosePrereq={onClosePrereq}
        onCopyModelUrl={onCopyModelUrl}
      />
    </>
  )
}
