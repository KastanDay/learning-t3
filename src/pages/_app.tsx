import { type AppType } from 'next/app'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { appWithTranslation } from 'next-i18next'
// import { ClerkLoaded, ClerkProvider, GoogleOneTap } from '@clerk/nextjs'
// import { dark } from '@clerk/themes'

import '~/styles/globals.css'
import Maintenance from '~/components/UIUC-Components/Maintenance'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from '@vercel/analytics/next';

import { KeycloakProvider } from '../providers/KeycloakProvider';
import { AuthProvider } from 'react-oidc-context'

// Check that PostHog is client-side (used to handle Next.js SSR)
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    opt_in_site_apps: true,
    autocapture: false,
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
  })
}

const MyApp: AppType = ({ Component, pageProps: { ...pageProps } }) => {
  const router = useRouter()
  const queryClient = new QueryClient()
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const effectRan = useRef(false)

  useEffect(() => {
    // Track page views in PostHog
    const handleRouteChange = () => posthog?.capture('$pageview')
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])
  
  const BYPASS_MAINTENANCE = ['/sign-in', '/sign-up']
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      if (BYPASS_MAINTENANCE.includes(router.pathname)) {
        setIsMaintenanceMode(false)
        return
      }
      
      if (effectRan.current) return

      try {
        const response = await fetch('/api/UIUC-api/getMaintenanceModeFast')
        const data = await response.json()
        console.log("Maintenance mode", data)
        setIsMaintenanceMode(false)
      } catch (error) {
        console.error('Failed to check maintenance mode:', error)
        setIsMaintenanceMode(false)
      }
    }

    checkMaintenanceMode()
    effectRan.current = true
  }, [])

  if (false) {
    return <Maintenance />
  } else {
    return (
      <KeycloakProvider>
        <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          <SpeedInsights />
          <Analytics />
          <Notifications position="bottom-center" zIndex={2077} />
          <ReactQueryDevtools
                initialIsOpen={false}
                position="left"
                buttonPosition="bottom-left"
              />
          <MantineProvider
                withGlobalStyles
                withNormalizeCSS
                theme={{
                  colorScheme: 'dark',
                  colors: {
                    // Add your color
                    deepBlue: ['#E9EDFC', '#C1CCF6', '#99ABF0' /* ... */],
                    lime: ['#a3e635', '#65a30d', '#365314' /* ... */],
                    aiPurple: ['#C06BF9'],
                    backgroundColors: ['#2e026d', '#020307'],
                    nearlyBlack: ['#0E1116'],
                    nearlyWhite: ['#F7F7F7'],
                    disabled: ['#2A2F36'],
                    errorBackground: ['#dc2626'],
                    errorBorder: ['#dc2626'],
                  },
                  // primaryColor: 'aiPurple',

                  shadows: {
                    // md: '1px 1px 3px rgba(0, 0, 0, .25)',
                    // xl: '5px 5px 3px rgba(0, 0, 0, .25)',
                  },

                  headings: {
                    fontFamily: 'Montserrat, Roboto, sans-serif',
                    sizes: {
                      h1: { fontSize: '3rem' },
                      h2: { fontSize: '2.2rem' },
                    },
                  },
                  defaultGradient: {
                    from: '#dc2626',
                    to: '#431407',
                    deg: 80,
                  },
                }}
              >
          <Component {...pageProps} />
          </MantineProvider>
        </PostHogProvider>
        </QueryClientProvider>
      </KeycloakProvider>
    )
  }
}

// export default .withTRPC(MyApp)

export default appWithTranslation(MyApp)
