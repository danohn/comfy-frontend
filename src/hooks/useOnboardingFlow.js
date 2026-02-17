import { useEffect, useState } from 'react'

export default function useOnboardingFlow({
  canCloseSettings,
  isOnboardingRoute,
  isSettingsRoute,
  navigate,
  apiUrl,
  syncApiFieldsFromUrl,
}) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)

  useEffect(() => {
    if (canCloseSettings) {
      setShowWelcome(false)
      return
    }

    const hasSeenWelcome = localStorage.getItem('comfy_onboarding_seen') === '1'
    if (hasSeenWelcome) {
      setShowWelcome(false)
      if (!isOnboardingRoute && !isSettingsRoute) {
        navigate('/onboarding', { replace: true })
      }
    } else {
      setShowWelcome(!isOnboardingRoute && !isSettingsRoute)
    }
  }, [canCloseSettings, isOnboardingRoute, isSettingsRoute, navigate])

  function handleStartOnboarding() {
    localStorage.setItem('comfy_onboarding_seen', '1')
    setShowWelcome(false)
    setOnboardingStep(1)
    syncApiFieldsFromUrl(apiUrl)
    navigate('/onboarding')
  }

  return {
    showWelcome,
    onboardingStep,
    setOnboardingStep,
    handleStartOnboarding,
  }
}
