// src/pages/[course_name]/index.tsx
import { type NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { type CourseMetadata } from '~/types/courseMetadata'
import { useUser } from '@clerk/nextjs'
import { LoadingSpinner } from '~/components/UIUC-Components/LoadingSpinner'
import { get_user_permission } from '~/components/UIUC-Components/runAuthCheck'
import { MainPageBackground } from '~/components/UIUC-Components/MainPageBackground'
import { fetchCourseMetadata } from '~/utils/apiUtils'

const IfCourseExists: NextPage = () => {
  const router = useRouter()
  const user = useUser()
  const [courseName, setCourseName] = useState<string | null>(null)
  const [courseMetadataIsLoaded, setCourseMetadataIsLoaded] = useState(false)
  const [courseMetadata, setCourseMetadata] = useState<CourseMetadata | null>(
    null,
  )
  const getCurrentPageName = () => {
    return router.query.course_name as string
  }

  useEffect(() => {
    if (!router.isReady) return
    const fetchMetadata = async () => {
      const course_name = getCurrentPageName()
      const metadata: CourseMetadata = await fetchCourseMetadata(course_name)

      if (metadata === null) {
        await router.replace('/new?course_name=' + course_name)
        return
      }

      if (!metadata.is_private) {
        // Public -- redirect as quickly as possible!
        await router.replace(`/${course_name}/chat`)
        return
      }
      setCourseName(course_name)
      setCourseMetadata(metadata)
      setCourseMetadataIsLoaded(true)
    }
    fetchMetadata()
  }, [router.isReady])

  useEffect(() => {
    const checkAuth = async () => {
      // AUTH
      if (courseMetadata && user.isLoaded) {
        const permission_str = get_user_permission(courseMetadata, user, router)

        if (permission_str === 'edit' || permission_str === 'view') {
          console.debug('Can view or edit')
          await router.replace(`/${courseName}/chat`)
          return
        } else {
          console.debug(
            'User does not have edit permissions, redirecting to not authorized page, permission: ',
            permission_str,
          )
          await router.replace(`/${courseName}/not_authorized`)
          return
        }
      }
    }
    checkAuth()
  }, [user.isLoaded, courseMetadata, courseMetadataIsLoaded])

  return (
    <MainPageBackground>
      <LoadingSpinner />
    </MainPageBackground>
  )
}
export default IfCourseExists
