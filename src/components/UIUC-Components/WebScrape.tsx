// Web Scrape
import { notifications } from '@mantine/notifications'
import {
  Button,
  Input,
  Title,
  useMantineTheme,
  Tooltip,
  Checkbox,
  TextInput,
  Text,
  SegmentedControl,
  Center,
  rem,
  List,
} from '@mantine/core'
import { IconEye, IconHome, IconSitemap, IconWorld, IconWorldDownload } from '@tabler/icons-react'
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useMediaQuery } from '@mantine/hooks'
import { callSetCourseMetadata } from '~/utils/apiUtils'
import { montserrat_heading, montserrat_paragraph } from 'fonts'
import { useRef } from 'react'

interface WebScrapeProps {
  is_new_course: boolean
  courseName: string
  isDisabled: boolean
  current_user_email: string
}

const shouldShowFields = (inputUrl: string) => {
  return !(
    inputUrl.includes('coursera.org') ||
    inputUrl.includes('ocw.mit.edu') ||
    inputUrl.includes('github.com') ||
    inputUrl.includes('canvas.illinois.edu')
  )
}

const validateUrl = (url: string) => {
  const courseraRegex = /^https?:\/\/(www\.)?coursera\.org\/learn\/.+/
  const mitRegex = /^https?:\/\/ocw\.mit\.edu\/.+/
  const githubRegex = /^https?:\/\/(www\.)?github\.com\/.+/
  const canvasRegex = /^https?:\/\/canvas\.illinois\.edu\/courses\/\d+/
  const webScrapingRegex = /^(https?:\/\/)?.+/

  return (
    courseraRegex.test(url) ||
    mitRegex.test(url) ||
    githubRegex.test(url) ||
    canvasRegex.test(url) ||
    webScrapingRegex.test(url)
  )
}

const formatUrl = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url
  }
  return url
}

const formatUrlAndMatchRegex = (url: string) => {
  // fullUrl always starts with http://. Is the starting place of the scrape. 
  // baseUrl is used to construct the match statement.


  // Ensure the url starts with 'http://'
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }

  // Extract the base url including the path
  const baseUrl = (url.replace(/^https?:\/\//i, '').split('?')[0] as string).replace(/\/$/, ''); // Remove protocol (http/s), split at '?', and remove trailing slash

  const matchRegex = `**${baseUrl}/**`

  return {
    fullUrl: baseUrl,
    matchRegex: matchRegex
  };
}

export const WebScrape = ({
  is_new_course,
  courseName,
  isDisabled,
  current_user_email,
}: WebScrapeProps) => {
  const [isUrlUpdated, setIsUrlUpdated] = useState(false)
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState(<IconWorldDownload size={'50%'} />)
  const [loadingSpinner, setLoadingSpinner] = useState(false)
  const router = useRouter()
  const isSmallScreen = useMediaQuery('(max-width: 960px)')
  const theme = useMantineTheme()
  const [maxUrls, setMaxUrls] = useState('50')
  const [maxDepth, setMaxDepth] = useState('2')
  const [scrapeStrategy, setScrapeStrategy] = useState<string>('equal-and-below')
  const [courseID, setCourseID] = useState<string>('')
  const [selectedContents, setSelectedContents] = useState<string[]>([])
  const [showContentOptions, setShowContentOptions] = useState<boolean>(false)
  const isCourseIDUpdated = courseID.trim() !== ''
  const logoRef = useRef(null)
  const [selectedCanvasOptions, setSelectedCanvasOptions] = useState<string[]>([
    'files',
    'pages',
    'modules',
    'syllabus',
    'assignments',
    'discussions',
  ])

  const handleCanvasOptionChange = (value: string) => {
    if (selectedCanvasOptions.includes(value)) {
      setSelectedCanvasOptions((prev) => prev.filter((item) => item !== value))
    } else {
      setSelectedCanvasOptions((prev) => [...prev, value])
    }
  }

  const handleCheckboxChange = (values: string[]) => {
    setSelectedContents(values)
  }

  const canvasSubmit = () => {
    console.log('Course ID:', courseID)
    console.log('Selected Contents:', selectedContents)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    variable: string,
  ) => {
    const value = e.target.value
    if (variable === 'maxUrls') {
      setMaxUrls(value)
    } else if (variable === 'maxDepth') {
      setMaxDepth(value)
    }
  }

  const handleSubmit = async () => {
    if (validateUrl(url)) {
      setLoadingSpinner(true)
      let data = null
      // Make API call based on URL
      if (url.includes('coursera.org')) {
        // TODO: coursera ingest
        alert(
          'Coursera ingest is not yet automated (auth is hard). Please email kvday2@illinois.edu to do it for you',
        )
      } else if (url.includes('ocw.mit.edu')) {
        data = downloadMITCourse(url, courseName, 'local_dir') // no await -- do in background

        showToast()

        if (is_new_course) {
          // set course exists in new metadata endpoint
          const response = callSetCourseMetadata(courseName, {
            course_owner: current_user_email,
            // Don't set properties we don't know about. We'll just upsert and use the defaults.
            course_admins: [],
            approved_emails_list: [],
            is_private: false,
            banner_image_s3: undefined,
            course_intro_message: undefined,
            openai_api_key: undefined,
            example_questions: undefined,
          })

          if (!response) {
            throw new Error('Error while setting course metadata')
          }
          router.push(`/${courseName}/materials`)
        }
        router.push(`/${courseName}/materials`)
      } else if (url.includes('canvas.illinois.edu/courses/')) {
        const canvasCourseIdParts = url.split('canvas.illinois.edu/courses/')
        const canvasCourseId = canvasCourseIdParts[1]?.split('/')[0]

        try {
          const response = await axios.get(
            'https://flask-production-751b.up.railway.app/ingestCanvas',
            {
              params: {
                course_id: canvasCourseId,
                course_name: courseName,
                files: selectedCanvasOptions.includes('files')
                  ? 'true'
                  : 'false',
                pages: selectedCanvasOptions.includes('pages')
                  ? 'true'
                  : 'false',
                modules: selectedCanvasOptions.includes('modules')
                  ? 'true'
                  : 'false',
                syllabus: selectedCanvasOptions.includes('syllabus')
                  ? 'true'
                  : 'false',
                assignments: selectedCanvasOptions.includes('assignments')
                  ? 'true'
                  : 'false',
                discussions: selectedCanvasOptions.includes('discussions')
                  ? 'true'
                  : 'false',
              },
            },
          )

          if (response.data.outcome) {
            console.log('Canvas content ingestion was successful!')
            // Navigate to the course materials page or any other success behavior
            router.push(`/${courseName}/materials`)
          } else {
            console.error('Canvas content ingestion failed.')
            // Handle the failure, maybe show a notification or alert to the user
          }
        } catch (error) {
          console.error('Error while ingesting Canvas content:', error)
        }
      } else {
        showToast()

        const response = await fetch('/api/UIUC-api/webScrapeConfig')
        let webScrapeConfig = await response.json()
        webScrapeConfig = webScrapeConfig.config

        data = scrapeWeb(
          url,
          courseName,
          maxUrls.trim() !== ''
            ? parseInt(maxUrls)
            : webScrapeConfig.num_sites,
          scrapeStrategy,
        )

        if (is_new_course) {
          // set course exists in fast course_metadatas KV db
          const response = callSetCourseMetadata(courseName, {
            course_owner: current_user_email,
            // Don't set properties we don't know about. We'll just upsert and use the defaults.
            course_admins: [],
            approved_emails_list: [],
            is_private: false,
            banner_image_s3: undefined,
            course_intro_message: undefined,
            openai_api_key: undefined,
            example_questions: undefined,
          })

          if (!response) {
            throw new Error('Error while setting course metadata')
          }
          router.replace(`/${courseName}/materials`)
        }
        router.push(`/${courseName}/materials`)
      }
    } else {
      alert('Invalid URL (please include https://)')
    }
    setLoadingSpinner(false)
    setUrl('') // clear url
  }

  const [inputErrors, setInputErrors] = useState({
    maxUrls: { error: false, message: '' },
    maxDepth: { error: false, message: '' },
  })

  const validateInputs = () => {
    const errors = {
      maxUrls: { error: false, message: '' },
      maxDepth: { error: false, message: '' },
    }
    // Check for maxUrls
    if (!maxUrls) {
      errors.maxUrls = {
        error: true,
        message: 'Please provide an input for Max URLs',
      }
    } else if (!/^\d+$/.test(maxUrls)) {
      // Using regex to ensure the entire string is a number
      errors.maxUrls = {
        error: true,
        message: 'Max URLs should be a valid number',
      }
    } else if (parseInt(maxUrls) < 1 || parseInt(maxUrls) > 500) {
      errors.maxUrls = {
        error: true,
        message: 'Max URLs should be between 1 and 500',
      }
    }

    setInputErrors(errors)
    return !Object.values(errors).some((error) => error.error)
  }

  const showToast = () => {
    return (
      // docs: https://mantine.dev/others/notifications/

      notifications.show({
        id: 'web-scrape-toast',
        withCloseButton: true,
        onClose: () => console.log('unmounted'),
        onOpen: () => console.log('mounted'),
        autoClose: 15000,
        // position="top-center",
        title: 'Web scraping started',
        message:
          "It'll scrape in the background, just wait for the results to show up in your project (~3 minutes total).\nThis feature is stable but the web is a messy place. If you have trouble, I'd love to fix it. Just shoot me an email: kvday2@illinois.edu.",
        icon: <IconWorldDownload />,
        styles: {
          root: {
            backgroundColor: theme.colors.nearlyWhite,
            borderColor: theme.colors.aiPurple,
          },
          title: {
            color: theme.colors.nearlyBlack,
          },
          description: {
            color: theme.colors.nearlyBlack,
          },
          closeButton: {
            color: theme.colors.nearlyBlack,
            '&:hover': {
              backgroundColor: theme.colors.dark[1],
            },
          },
        },
        loading: false,
      })
    )
  }

  const scrapeWeb = async (
    url: string | null,
    courseName: string | null,
    maxUrls: number,
    scrapeStrategy: string,
  ) => {
    try {
      if (!url || !courseName) return null
      console.log('SCRAPING', url)

      const fullUrl = formatUrl(url)

      const postParams = {
        url: fullUrl,
        courseName: courseName,
        maxPagesToCrawl: maxUrls,
        scrapeStrategy: scrapeStrategy,
        match: formatUrlAndMatchRegex(fullUrl).matchRegex,
        maxTokens: 2000000, // basically inf.
      }
      console.log("About to post to the web scraping endpoint, with params:", postParams)

      const response = await axios.post(
        `https://crawlee-production.up.railway.app/crawl`,
        {
          params: postParams,
        },
      )
      console.log("Response from web scraping endpoint:", response.data)
      return response.data
    } catch (error) {
      console.error('Error during web scraping:', error)
      return null
    }
  }

  const downloadMITCourse = async (
    url: string | null,
    courseName: string | null,
    localDir: string | null,
  ) => {
    try {
      if (!url || !courseName || !localDir) return null
      console.log('calling downloadMITCourse')
      const response = await axios.get(
        `https://flask-production-751b.up.railway.app/mit-download`,
        {
          params: {
            url: url,
            course_name: courseName,
            local_dir: localDir,
          },
        },
      )
      return response.data
    } catch (error) {
      console.error('Error during MIT course download:', error)
      return null
    }
  }

  const checkboxStyle = {
    borderColor: theme.colors.gray[4] as string,
  }

  useEffect(() => {
    if (logoRef.current) {
      const logoElement = logoRef.current as HTMLImageElement
      logoElement.style.width = '60%'
      logoElement.style.height = '60%'
      logoElement.style.position = 'relative'
      logoElement.style.top = '2px'
    }
  }, [logoRef.current])

  useEffect(() => {
    if (url && url.length > 0 && validateUrl(url)) {
      console.log('url updated : ', url)
      setIsUrlUpdated(true)
    } else {
      console.log('url empty')
      setIsUrlUpdated(false)
    }
  }, [url])

  return (
    <>
      <Title
        order={3}
        className={`w-full text-center ${montserrat_heading.variable} pt-4 font-montserratHeading`}
      >
        OR
      </Title>
      <Title
        order={4}
        className={`w-full text-center ${montserrat_heading.variable} mt-4 font-montserratHeading`}
      >
        Web scrape any website that allows it
      </Title>

      <Input
        icon={icon}
        // I can't figure out how to change the background colors.
        className={`mt-4 w-[80%] min-w-[20rem] disabled:bg-purple-200 lg:w-[75%]`}
        wrapperProps={{ borderRadius: 'xl' }}
        styles={{ input: { backgroundColor: '#1A1B1E' } }}
        placeholder="Enter URL"
        radius={'xl'}
        value={url}
        size={'lg'}
        disabled={isDisabled}
        onChange={(e) => {
          setUrl(e.target.value)
          setShowContentOptions(e.target.value.includes('canvas.illinois.edu'))
          if (e.target.value.includes('coursera.org')) {
            setIcon(
              <img
                src={'/media/coursera_logo_cutout.png'}
                alt="Coursera Logo"
                style={{ height: '50%', width: '50%' }}
              />,
            )
          } else if (e.target.value.includes('ocw.mit.edu')) {
            setIcon(
              <img
                src={'/media/mitocw_logo.jpg'}
                alt="MIT OCW Logo"
                style={{ height: '50%', width: '50%' }}
              />,
            )
          } else if (e.target.value.includes('github.com')) {
            setIcon(
              <img
                src="/media/github-mark-white.png"
                alt="GitHub Logo"
                style={{ height: '50%', width: '50%' }}
              />,
            )
          } else if (e.target.value.includes('canvas.illinois.edu')) {
            setIcon(
              <img
                src="/media/canvas_logo.png"
                alt="Canvas Logo"
                style={{ height: '50%', width: '50%' }}
              />,
            )
          } else {
            setIcon(<IconWorldDownload />)
          }
        }}
        onKeyPress={(event) => {
          if (event.key === 'Enter') {
            handleSubmit()
          }
        }}
        rightSection={
          <Button
            onClick={(e) => {
              e.preventDefault()
              if (validateInputs() && validateUrl(url)) {
                handleSubmit()
              }
            }}
            size="md"
            radius={'xl'}
            className={`rounded-s-md ${isUrlUpdated ? 'bg-purple-800' : 'border-purple-800'
              } overflow-ellipsis text-ellipsis p-2 ${isUrlUpdated ? 'text-white' : 'text-gray-500'
              } min-w-[5rem] -translate-x-1 transform hover:border-indigo-600 hover:bg-indigo-600 hover:text-white focus:shadow-none focus:outline-none`}
            w={`${isSmallScreen ? 'auto' : 'auto'}`}
            disabled={isDisabled}
          >
            Ingest
          </Button>
        }
        rightSectionWidth={isSmallScreen ? 'auto' : 'auto'}
      />

      {/* Canvas ingest form */}
      {showContentOptions && (
        <form
          className="mt-3 w-[70%] min-w-[20rem] lg:w-[70%]"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div>
            <div className="mb-2 flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest all files from the Canvas course."
              >
                <Checkbox
                  value="files"
                  label="Files"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('files')}
                  onChange={() => handleCanvasOptionChange('files')}
                />
              </Tooltip>
            </div>
            <div className="mb-2 flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest all pages from the Canvas course."
              >
                <Checkbox
                  value="pages"
                  label="Pages"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('pages')}
                  onChange={() => handleCanvasOptionChange('pages')}
                />
              </Tooltip>
            </div>
            <div className="mb-2 flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest all modules from the Canvas course."
              >
                <Checkbox
                  value="modules"
                  label="Modules"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('modules')}
                  onChange={() => handleCanvasOptionChange('modules')}
                />
              </Tooltip>
            </div>
            <div className="mb-2 flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest the course syllabus from Canvas."
              >
                <Checkbox
                  value="syllabus"
                  label="Syllabus"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('syllabus')}
                  onChange={() => handleCanvasOptionChange('syllabus')}
                />
              </Tooltip>
            </div>
            <div className="mb-2 flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest all assignments from the Canvas course."
              >
                <Checkbox
                  value="assignments"
                  label="Assignments"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('assignments')}
                  onChange={() => handleCanvasOptionChange('assignments')}
                />
              </Tooltip>
            </div>
            <div className="flex items-center">
              <Tooltip
                multiline
                color="#15162b"
                arrowPosition="side"
                position="bottom-start"
                arrowSize={8}
                withArrow
                label="Select this option to ingest all discussions from the Canvas course."
              >
                <Checkbox
                  value="discussions"
                  label="Discussions"
                  size="md"
                  style={checkboxStyle}
                  checked={selectedCanvasOptions.includes('discussions')}
                  onChange={() => handleCanvasOptionChange('discussions')}
                />
              </Tooltip>
            </div>
          </div>
          <Text className="mt-4 text-lg font-bold text-red-600 underline">
            Please ensure that you have added the UIUC Chatbot as a student to
            your course on Canvas before you begin ingesting the course content.
            The bot email address is uiuc.chat@ad.uillinois.edu and the bot name
            is UIUC Course AI.
          </Text>
        </form>
      )}

      {/* Detailed web ingest form */}
      {isUrlUpdated && shouldShowFields(url) && (
        <form
          className="w-[80%] min-w-[20rem] lg:w-[75%]"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div className="pt-2 pb-2">
            <Tooltip
              multiline
              w={400}
              color="#15162b"
              arrowPosition="side"
              arrowSize={8}
              withArrow
              position="bottom-start"
              label="We will attempt to visit this number of pages, but not all will be scraped if they're duplicates, broken or otherwise inaccessible."
            >
              <div>
                <Text style={{ color: '#C1C2C5', fontSize: '16px' }} className={`${montserrat_heading.variable} font-montserratHeading`}>Max URLs (1 to 500)</Text>
                <TextInput
                  styles={{ input: { backgroundColor: '#1A1B1E' } }}
                  name="maximumUrls"
                  radius='md'
                  placeholder="Default 50"
                  value={maxUrls}
                  onChange={(e) => {
                    handleInputChange(e, 'maxUrls')
                  }}
                  error={inputErrors.maxUrls.error}
                />
              </div>
            </Tooltip>
          </div>
          {inputErrors.maxUrls.error && (
            <p style={{ color: 'red' }}>{inputErrors.maxUrls.message}</p>
          )}
          {inputErrors.maxDepth.error && (
            <p style={{ color: 'red' }}>{inputErrors.maxDepth.message}</p>
          )}

          <Text style={{ color: '#C1C2C5', fontSize: '16px' }} className={`${montserrat_heading.variable} font-montserratHeading`}>Limit web crawl</Text>
          {/* <Text style={{ color: '#C1C2C5', fontSize: '16px' }} className={`${montserrat_paragraph.variable} font-montserratParagraph`}>Limit web crawl (from least to most inclusive)</Text> */}
          <div className='pl-3'>
            <List>
              <List.Item><strong>Equal and Below:</strong> Only scrape content below the given URL. E.g. nasa.gov/blogs will scrape all blogs but never go to nasa.gov/events.</List.Item>
              <List.Item><strong>Entire domain:</strong> Crawl as much of this entire website as possible. E.g. nasa.gov also includes docs.nasa.gov</List.Item>
              <List.Item><strong>All:</strong> Start on the given URL, but will to wander the web.</List.Item>
            </List>
          </div>
          <Text style={{ color: '#C1C2C5' }}><strong>I suggest starting with Equal and Below</strong>, then just re-run this if you need more later.</Text>
          <div className='pt-2'></div>
          <SegmentedControl
            fullWidth
            size="sm"
            radius="md"
            value={scrapeStrategy}
            onChange={(strat) => setScrapeStrategy(strat)}
            data={[
              {
                value: 'equal-and-below',
                label: (
                  <Center style={{ gap: 10 }}>
                    <IconSitemap style={{ width: rem(16), height: rem(16) }} />
                    <span>Equal and Below</span>
                  </Center>
                ),
              },
              {
                value: 'same-domain',
                label: (
                  <Center style={{ gap: 10 }}>
                    <IconHome style={{ width: rem(16), height: rem(16) }} />
                    <span>Entire domain</span>
                  </Center>
                ),
              },
              {
                value: 'all',
                label: (
                  <Center style={{ gap: 10 }}>
                    <IconWorld style={{ width: rem(16), height: rem(16) }} />
                    <span>All</span>
                  </Center>
                ),
              },
            ]}
          />
        </form>
      )}
    </>
  )
}
