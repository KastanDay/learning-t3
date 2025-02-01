import { montserrat_heading, montserrat_paragraph } from 'fonts'
import { Title, Text, Flex, Divider, ActionIcon, Button, Card, Modal } from '@mantine/core'
import React, { useEffect, useState } from 'react'
import { IconInfoCircle } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function NomicDocumentMap({ course_name }: { course_name: string }) {
  const [accordionOpened, setAccordionOpened] = useState(false)

  const [nomicMapData, setNomicMapData] = useState<NomicMapData | null>(null)
  const [nomicIsLoading, setNomicIsLoading] = useState(true)

  // fetch nomicMapData
  useEffect(() => {
    const fetchNomicMapData = async () => {
      try {
        const response = await fetch(
          `/api/getNomicMapForQueries?course_name=${course_name}&map_type=document`,
        )

        const responseText = await response.text()
        const data = JSON.parse(responseText)

        const parsedData: NomicMapData = {
          map_id: data.map_id,
          map_link: data.map_link,
        }
        console.log('Parsed nomic map data:', parsedData)
        setNomicMapData(parsedData)
        setNomicIsLoading(false)
      } catch (error) {
        console.error('NomicDocumentsMap - Error fetching nomic map:', error)
        setNomicIsLoading(false)
      }
    }

    fetchNomicMapData()
  }, [course_name])

  return (
    <>
      <Card
        shadow="xs"
        padding="none"
        radius="xl"
        className="mt-[2%] w-[96%] md:w-[90%] 2xl:w-[90%]"
      // className="mt-[2%] h-[80vh] w-[80vw]"
      >
        <div className="min-h-full bg-gradient-to-r from-purple-900 via-indigo-800 to-blue-800">


          <div className="w-full border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6 sm:py-4 md:px-8">
            {/* <div className="flex items-center justify-between gap-2"> */}
            <div className="flex items-center gap-2">
              <Title
                order={3}
                className={`${montserrat_heading.variable} font-montserratHeading text-lg text-white/90 sm:text-2xl`}
              >
                Project Files Visualization
              </Title>

              {/* Accordion info button */}
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setAccordionOpened(!accordionOpened)}
                className="hover:bg-white/10"
                title="More info on nomic map"
              >
                <IconInfoCircle className="text-white/60" />
              </ActionIcon>
            </div>
          </div>


          {/* Accordion scroll down area */}
          <AnimatePresence>
            {accordionOpened && (
              <>
                <div className="bg-[#1e1f3a]/80 px-4 py-4 sm:px-6 sm:py-6 md:px-8">
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className=" overflow-hidden"
                  >
                    <div className="flex bg-[#1e1f3a]/80 backdrop-blur-sm">
                      <div className="w-1 bg-violet-500/50" />
                      <div
                        className={`${montserrat_paragraph.variable}  flex-1 p-4 font-montserratParagraph`}
                      >
                        <Text
                          className={`${montserrat_paragraph.variable} mb-4 font-montserratParagraph text-white/80`}
                        >
                          The Concept Map visualizes all queries made in this
                          project:
                        </Text>
                        <ul className="list-inside list-disc space-y-2 text-white/80">
                          <li className="text-sm">
                            <span className="text-violet-300">
                              Similar topics
                            </span>{' '}
                            cluster together
                          </li>
                          <li className="text-sm">
                            <span className="text-violet-300">
                              Different topics
                            </span>{' '}
                            are positioned further apart
                          </li>
                          <li className="text-sm">
                            <span className="text-violet-300">
                              Common themes
                            </span>{' '}
                            and knowledge gaps become visible
                          </li>
                        </ul>
                        <Text className="mt-3 text-gray-400" size="sm">
                          Learn more about{' '}
                          <a
                            className="text-purple-400 underline hover:text-purple-300"
                            href="https://atlas.nomic.ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            semantic similarity visualizations
                          </a>
                        </Text>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
          <div className="bg-[#1e1f3a]/80">
            {/* NOMIC MAP  */}
            {nomicIsLoading ? (
              <>
                <span className="skeleton-box w-full"></span>
              </>
            ) : nomicMapData && nomicMapData.map_id ? (
              <>
                <iframe
                  className="w-full h-full p-6"
                  id={nomicMapData.map_id}
                  allow="clipboard-read; clipboard-write"
                  src={nomicMapData.map_link}
                  style={{ height: '80vh' }}
                />
                <Text className="pb-4 pl-6 text-gray-400" size="sm">
                  Note you are unable to login or edit this map. It&apos;s for
                  your visualization only. Please{' '}
                  <a
                    href="mailto:kvday2@illinois.edu"
                    className="text-purple-400 underline hover:text-purple-300"
                  >
                    contact us
                  </a>{' '}
                  with questions.
                </Text>
              </>
            ) : (
              <>
                <div className="w-full">
                  <Text
                    className={`${montserrat_heading.variable} font-montserratHeading text-gray-200`}
                    size="lg"
                  >
                    Visualization Not Available Yet
                  </Text>
                  <Text className="mt-2 text-gray-300">
                    We need at least 20 documents to generate a meaningful
                    visualization of how topics relate to each other. Please upload more documents and check back tomorrow!
                    Maps are regenerated every night around midnight Chicago time (CT).
                  </Text>
                  <Text className="mt-3 text-gray-400" size="sm">
                    Learn more about{' '}
                    <a
                      className="text-purple-400 underline hover:text-purple-300"
                      href="https://atlas.nomic.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      semantic similarity visualizations
                    </a>
                  </Text>
                </div>
              </>
            )}



          </div>
        </div>
      </Card >
    </>
  )
}
