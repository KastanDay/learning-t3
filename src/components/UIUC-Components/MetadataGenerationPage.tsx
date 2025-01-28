import {
  Card,
  Title,
  Flex,
  Text,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Alert,
  Group,
  Table,
} from '@mantine/core'
import { montserrat_heading, montserrat_paragraph } from 'fonts'
import { useMediaQuery } from '@mantine/hooks'
import { type CourseMetadata } from '~/types/courseMetadata'
import { useState } from 'react'
import { IconDownload, IconRefresh, IconAlertCircle } from '@tabler/icons-react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type Query,
} from '@tanstack/react-query'
import {
  generateMetadata,
  getDocumentStatuses,
  downloadMetadataCSV,
  getMetadataDocuments,
  getMetadataFields,
  type DocumentStatus,
  type MetadataDocument,
  type MetadataField,
} from '~/utils/apiUtils'
import { MetadataResultsTable } from './MetadataResultsTable'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { MultiSelect } from './ui/multi-select'
import { cn } from '~/lib/utils'

// Types for metadata generation
interface MetadataRun {
  run_id: number
  timestamp: string
  prompt: string
  status: 'completed' | 'failed' | 'running'
  document_count?: number
}

// Function to get metadata history
async function getMetadataHistory(courseName: string): Promise<MetadataRun[]> {
  const response = await fetch(
    `/api/UIUC-api/getMetadataHistory?course_name=${encodeURIComponent(courseName)}`,
  )

  if (!response.ok) {
    throw new Error(`Failed to get metadata history: ${response.statusText}`)
  }

  const data = await response.json()
  return data.history || []
}

export default function MetadataGenerationPage({
  course_name,
  metadata,
}: {
  course_name: string
  metadata: CourseMetadata | null
}) {
  const isSmallScreen = useMediaQuery('(max-width: 960px)')
  const [prompt, setPrompt] = useState('')
  const queryClient = useQueryClient()
  const [currentRunId, setCurrentRunId] = useState<number | null>(null)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [selectedHistoryRun, setSelectedHistoryRun] =
    useState<MetadataRun | null>(null)

  // Query for available documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['metadataDocuments', course_name],
    queryFn: () => getMetadataDocuments(course_name),
  })

  // Create document options for MultiSelect
  const documentOptions = documents.map((doc) => ({
    value: doc.id.toString(),
    label: doc.readable_filename,
  }))

  // Create document names map for the table
  const documentNames = documents.reduce(
    (acc, doc) => ({ ...acc, [doc.id]: doc.readable_filename }),
    {} as Record<number, string>,
  )

  // Mutation for generating metadata
  const { mutate: generateMetadataMutation, isPending: isGenerating } =
    useMutation({
      mutationFn: () =>
        generateMetadata(prompt, selectedDocumentIds.map(Number)),
      onSuccess: (data) => {
        setCurrentRunId(data.run_id)
        queryClient.invalidateQueries({ queryKey: ['documentStatuses'] })
      },
    })

  // Query for document statuses
  const { data: documentStatuses = [], isLoading: isLoadingStatuses } =
    useQuery({
      queryKey: ['documentStatuses', selectedDocumentIds],
      queryFn: () => getDocumentStatuses(selectedDocumentIds.map(Number)),
      enabled: currentRunId !== null,
      refetchInterval: (query: Query<DocumentStatus[], Error>) => {
        // If any document is still running, poll every 5 seconds
        if (
          query.state.data?.some((doc) => doc.metadata_status === 'running')
        ) {
          return 5000
        }
        return false
      },
    })

  // Mutation for downloading CSV
  const { mutate: downloadCSV, isPending: isDownloading } = useMutation({
    mutationFn: () => downloadMetadataCSV(currentRunId ? [currentRunId] : []),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `metadata_${course_name}_${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
  })

  // Check if all documents are processed
  const isAllCompleted = documentStatuses?.every(
    (doc) => doc.metadata_status !== 'running',
  )
  const hasError = documentStatuses?.some(
    (doc) => doc.metadata_status === 'failed',
  )

  // Query for metadata history
  const { data: historyData = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['metadataHistory', course_name],
    queryFn: () => getMetadataHistory(course_name),
  })

  // Query for document statuses for history item
  const {
    data: historyDocumentStatuses = [],
    isLoading: isLoadingHistoryStatuses,
  } = useQuery({
    queryKey: ['historyDocumentStatuses', selectedHistoryRun?.run_id],
    queryFn: async () => {
      if (!selectedHistoryRun) return []
      // Get all document statuses for the selected run
      const response = await fetch(
        `/api/UIUC-api/getDocumentStatuses?run_id=${selectedHistoryRun.run_id}`,
      )
      if (!response.ok) {
        throw new Error('Failed to fetch document statuses')
      }
      const data = await response.json()
      return data.statuses || []
    },
    enabled: selectedHistoryRun !== null && !currentRunId,
  })

  // Query for metadata fields for current run
  const { data: currentMetadata = [], isLoading: isLoadingCurrentMetadata } =
    useQuery({
      queryKey: ['metadataFields', currentRunId],
      queryFn: async () => {
        console.log('Fetching current metadata for run ID:', currentRunId)
        const data = await getMetadataFields(currentRunId!)
        console.log('Current metadata response:', data)
        return data
      },
      enabled: currentRunId !== null && isAllCompleted && !hasError,
    })

  // Query for metadata fields for history item
  const { data: historyMetadata = [], isLoading: isLoadingHistoryMetadata } =
    useQuery({
      queryKey: ['metadataFields', selectedHistoryRun?.run_id],
      queryFn: async () => {
        console.log(
          'Fetching history metadata for run ID:',
          selectedHistoryRun?.run_id,
        )
        const data = await getMetadataFields(selectedHistoryRun!.run_id)
        console.log('History metadata response:', data)
        return data
      },
      enabled: selectedHistoryRun !== null && !currentRunId,
    })

  // Function to handle history item click
  const handleHistoryClick = (run: MetadataRun) => {
    if (!currentRunId) {
      setSelectedHistoryRun(run === selectedHistoryRun ? null : run)
      // Invalidate the history document statuses query to force a refetch
      queryClient.invalidateQueries({
        queryKey: ['historyDocumentStatuses', run.run_id],
      })
    }
  }

  // Function to render metadata value
  const renderMetadataValue = (value: any) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') {
      return (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
    return String(value)
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Card
        shadow="xs"
        padding="none"
        radius="xl"
        className="w-[96%] md:w-[90%] 2xl:w-[90%]"
      >
        <Flex direction={isSmallScreen ? 'column' : 'row'}>
          {/* Left Panel - Main Content */}
          <div
            style={{
              flex: isSmallScreen ? '1 1 100%' : '1 1 60%',
              border: 'None',
              color: 'white',
            }}
            className="min-h-full rounded-l-xl bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-800"
          >
            <div className="w-full rounded-tl-xl border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6 sm:py-4 md:px-8">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Title
                    order={2}
                    className={`${montserrat_heading.variable} font-montserratHeading text-lg text-white/90 sm:text-2xl`}
                  >
                    Metadata
                  </Title>
                  <Text className="text-white/60">/</Text>
                  <Title
                    order={3}
                    variant="gradient"
                    gradient={{ from: 'gold', to: 'white', deg: 50 }}
                    className={`${montserrat_heading.variable} min-w-0 font-montserratHeading text-base sm:text-xl ${
                      course_name.length > 40
                        ? 'max-w-[120px] truncate sm:max-w-[300px] lg:max-w-[400px]'
                        : ''
                    }`}
                  >
                    {course_name}
                  </Title>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
              {/* Document Selection and Prompt Area */}
              <Card className="mb-6 rounded-xl bg-black/20 p-6">
                <Title
                  order={3}
                  className={`${montserrat_heading.variable} mb-6 font-montserratHeading text-white/90`}
                >
                  Generate Metadata
                </Title>

                {/* Document Selection */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <Text
                      className={`${montserrat_paragraph.variable} font-montserratParagraph text-white/90`}
                    >
                      Select Documents
                    </Text>
                    <Text
                      className={`${montserrat_paragraph.variable} font-montserratParagraph text-xs text-white/60`}
                    >
                      You can select multiple documents
                    </Text>
                  </div>
                  <MultiSelect
                    options={documentOptions}
                    selected={selectedDocumentIds}
                    onChange={setSelectedDocumentIds}
                    placeholder="Search and select documents..."
                    disabled={currentRunId !== null || isGenerating}
                    className="border-white/10 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                  <Text
                    className={`${montserrat_paragraph.variable} mb-2 font-montserratParagraph text-white/90`}
                  >
                    Enter Prompt
                  </Text>
                  <Textarea
                    placeholder="e.g., Generate metadata for all PDF documents..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] border-white/10 bg-[#1A1B1E] text-white placeholder:text-white/50 focus-visible:ring-indigo-500"
                    disabled={isGenerating || currentRunId !== null}
                  />
                </div>

                {/* Generate Button */}
                <div className="w-fit">
                  <Button
                    className="relative transform bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                    onClick={() => generateMetadataMutation()}
                    disabled={
                      isGenerating ||
                      currentRunId !== null ||
                      !prompt.trim() ||
                      selectedDocumentIds.length === 0
                    }
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <IconRefresh className="h-4 w-4 animate-spin" />
                        Generating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IconRefresh className="h-4 w-4" />
                        Generate
                      </div>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Panel - History */}
          <div
            style={{
              flex: isSmallScreen ? '1 1 100%' : '1 1 40%',
              backgroundColor: '#15162c',
              color: 'white',
            }}
            className="rounded-r-xl p-4 sm:p-6"
          >
            <Title
              order={3}
              className={`${montserrat_heading.variable} mb-4 font-montserratHeading text-white/90`}
            >
              Generation History
            </Title>
            <ScrollArea
              h={isSmallScreen ? 300 : 'calc(100vh - 200px)'}
              className="pr-4"
            >
              {isLoadingHistory ? (
                <Text color="dimmed">Loading history...</Text>
              ) : historyData.length === 0 ? (
                <Text color="dimmed">No previous runs</Text>
              ) : (
                <div className="space-y-4">
                  {historyData.map((run) => (
                    <Card
                      key={run.run_id}
                      className={cn(
                        'cursor-pointer rounded-lg bg-black/20 p-4 transition-colors hover:bg-black/30',
                        selectedHistoryRun?.run_id === run.run_id &&
                          !currentRunId &&
                          'ring-1 ring-indigo-500',
                        currentRunId && 'cursor-not-allowed opacity-50',
                      )}
                      padding="sm"
                      onClick={() => handleHistoryClick(run)}
                    >
                      <Group position="apart" mb="xs">
                        <Text
                          className={`${montserrat_paragraph.variable} font-montserratParagraph text-sm text-white/90`}
                        >
                          Run #{run.run_id}
                        </Text>
                        <div className="flex items-center gap-2">
                          <Text
                            className={`${montserrat_paragraph.variable} font-montserratParagraph text-xs text-white/60`}
                          >
                            {new Date(run.timestamp).toLocaleString()}
                          </Text>
                          {run.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 p-0 text-white/60 hover:bg-white/10 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadCSV()
                              }}
                            >
                              <IconDownload className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </Group>
                      <Text
                        className={`${montserrat_paragraph.variable} mb-2 line-clamp-2 font-montserratParagraph text-sm text-white/80`}
                      >
                        {run.prompt}
                      </Text>
                      <Group position="apart">
                        <Text
                          className={`${montserrat_paragraph.variable} font-montserratParagraph text-xs`}
                          color={
                            run.status === 'completed'
                              ? 'teal'
                              : run.status === 'failed'
                                ? 'red'
                                : 'yellow'
                          }
                        >
                          {run.status.toUpperCase()}
                        </Text>
                        {run.document_count && (
                          <Text
                            className={`${montserrat_paragraph.variable} font-montserratParagraph text-xs text-white/60`}
                          >
                            {run.document_count} document
                            {run.document_count !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </Group>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </Flex>
      </Card>

      {/* Results Table */}
      {((currentRunId && isAllCompleted && !hasError) ||
        selectedHistoryRun) && (
        <Card className="mb-6 w-[96%] rounded-xl bg-black/20 p-6 md:w-[90%] 2xl:w-[90%]">
          <div className="mb-4 flex items-center justify-between">
            <Title
              order={4}
              className={`${montserrat_heading.variable} font-montserratHeading text-white/90`}
            >
              {currentRunId
                ? 'Generated Metadata'
                : `Run #${selectedHistoryRun!.run_id} Metadata`}
            </Title>

            {((currentRunId && isAllCompleted && !hasError) ||
              selectedHistoryRun?.status === 'completed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log(
                    'Downloading CSV for run ID:',
                    currentRunId || selectedHistoryRun?.run_id,
                  )
                  downloadCSV()
                }}
                className="relative transform border-white/10 bg-transparent text-white transition-all hover:bg-white/10 disabled:opacity-50"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="flex items-center gap-2">
                    <IconDownload className="h-4 w-4 animate-spin" />
                    Exporting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IconDownload className="h-4 w-4" />
                    Export CSV
                  </div>
                )}
              </Button>
            )}
          </div>

          {isLoadingCurrentMetadata || isLoadingHistoryMetadata ? (
            <div className="flex h-32 items-center justify-center">
              <Text color="dimmed">Loading metadata...</Text>
            </div>
          ) : (currentRunId ? currentMetadata : historyMetadata).length ===
            0 ? (
            <div className="flex h-32 items-center justify-center">
              <Text color="dimmed">No metadata available</Text>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Debug log */}
              {(() => {
                console.log(
                  'Rendering metadata table with data:',
                  currentRunId ? currentMetadata : historyMetadata,
                )
                return null
              })()}
              <Table className="w-full">
                <thead>
                  <tr>
                    <th className="border-b border-white/10 px-4 py-2 text-left text-sm font-semibold text-white/90">
                      Document
                    </th>
                    <th className="border-b border-white/10 px-4 py-2 text-left text-sm font-semibold text-white/90">
                      Field
                    </th>
                    <th className="border-b border-white/10 px-4 py-2 text-left text-sm font-semibold text-white/90">
                      Value
                    </th>
                    <th className="border-b border-white/10 px-4 py-2 text-left text-sm font-semibold text-white/90">
                      Confidence
                    </th>
                    <th className="border-b border-white/10 px-4 py-2 text-left text-sm font-semibold text-white/90">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(currentRunId ? currentMetadata : historyMetadata).map(
                    (field, index) => {
                      console.log('Rendering field:', field)
                      return (
                        <tr
                          key={index}
                          className="border-b border-white/10 last:border-0"
                        >
                          <td className="px-4 py-2 text-sm text-white/80">
                            {documentNames[field.document_id] ||
                              `Document ${field.document_id}`}
                          </td>
                          <td className="px-4 py-2 text-sm text-white/80">
                            {field.field_name}
                          </td>
                          <td className="px-4 py-2 text-sm text-white/80">
                            {renderMetadataValue(field.field_value)}
                          </td>
                          <td className="px-4 py-2 text-sm text-white/80">
                            {field.confidence_score !== null
                              ? `${Math.round(field.confidence_score * 100)}%`
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-white/80">
                            {field.extraction_method || '-'}
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
