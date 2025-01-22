import {
  Card,
  Title,
  Flex,
  Text,
  Textarea,
  Button,
  Table,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { montserrat_heading, montserrat_paragraph } from 'fonts'
import { useMediaQuery } from '@mantine/hooks'
import { type CourseMetadata } from '~/types/courseMetadata'
import { useState } from 'react'
import { IconDownload, IconRefresh } from '@tabler/icons-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types for metadata generation
interface MetadataRun {
  id: string
  timestamp: string
  prompt: string
  status: 'completed' | 'failed' | 'running'
  results?: Record<string, string>[]
}

// Mock data for development
const mockRuns: MetadataRun[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    prompt: 'Generate metadata for all PDF documents about machine learning',
    status: 'completed',
    results: [
      {
        document: 'machine_learning_basics.pdf',
        title: 'Introduction to Machine Learning',
        summary: 'A comprehensive guide to ML fundamentals',
        topics: 'ML, AI, Neural Networks',
        pages: '45',
        author: 'John Smith',
      },
      {
        document: 'deep_learning.pdf',
        title: 'Deep Learning Fundamentals',
        summary: 'Advanced concepts in deep learning',
        topics: 'Deep Learning, CNN, RNN',
        pages: '78',
        author: 'Jane Doe',
      },
    ],
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    prompt: 'Extract metadata from computer science lecture notes',
    status: 'completed',
    results: [
      {
        document: 'algorithms.pdf',
        title: 'Advanced Algorithms',
        summary: 'Graph algorithms and complexity theory',
        topics: 'Algorithms, Complexity',
        pages: '32',
        author: 'Prof. Wilson',
      },
    ],
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    prompt: 'Analyze research papers on quantum computing',
    status: 'failed',
  },
]

// Mock function - replace with actual API call
const generateMetadata = async (
  prompt: string,
  courseName: string,
): Promise<MetadataRun> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 2000))

  return {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    prompt,
    status: 'completed',
    results: [
      {
        document: 'quantum_mechanics.pdf',
        title: 'Quantum Mechanics Basics',
        summary: 'Introduction to quantum mechanics principles',
        topics: 'Quantum, Physics',
        pages: '55',
        author: 'Dr. Feynman',
      },
      {
        document: 'quantum_computing.pdf',
        title: 'Quantum Computing Applications',
        summary: 'Practical applications in quantum computing',
        topics: 'Quantum Computing, Algorithms',
        pages: '42',
        author: 'Dr. Bell',
      },
    ],
  }
}

// Mock function - replace with actual API call
const fetchMetadataRuns = async (
  courseName: string,
): Promise<MetadataRun[]> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return mockRuns
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

  // Fetch metadata runs
  const { data: runs = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ['metadataRuns', course_name],
    queryFn: () => fetchMetadataRuns(course_name),
  })

  // Generate metadata mutation
  const { mutate: generateMetadataMutation, isPending: isGenerating } =
    useMutation({
      mutationFn: () => generateMetadata(prompt, course_name),
      onSuccess: (newRun) => {
        queryClient.setQueryData(
          ['metadataRuns', course_name],
          (old: MetadataRun[] = []) => [newRun, ...old],
        )
        setPrompt('')
      },
    })

  // CSV Export function
  const exportToCSV = (results: Record<string, string>[] | undefined) => {
    if (!results?.length || !results[0]) return

    const headers = Object.keys(results[0] as Record<string, string>)
    const csvContent = [
      headers.join(','),
      ...results.map((row) =>
        headers.map((header) => `"${row[header] || ''}"`).join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `metadata_${course_name}_${new Date().toISOString()}.csv`
    link.click()
  }

  const latestResults = runs[0]?.results
  const hasLatestResults =
    latestResults && latestResults.length > 0 && latestResults[0]
  const headers = hasLatestResults
    ? Object.keys(latestResults[0] as Record<string, string>)
    : []

  return (
    <Card
      shadow="xs"
      padding="none"
      radius="xl"
      className="mt-[2%] w-[96%] md:w-[90%] 2xl:w-[90%]"
    >
      <Flex direction={isSmallScreen ? 'column' : 'row'}>
        {/* Left Panel - Main Content */}
        <div
          style={{
            flex: isSmallScreen ? '1 1 100%' : '1 1 60%',
            border: 'None',
            color: 'white',
          }}
          className="min-h-full bg-gradient-to-r from-purple-900 via-indigo-800 to-blue-800"
        >
          <div className="w-full border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6 sm:py-4 md:px-8">
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
            {/* Generation Form */}
            <Card className="mb-6 bg-black/20">
              <Title
                order={3}
                className={`${montserrat_heading.variable} mb-4 font-montserratHeading text-white/90`}
              >
                Generate Metadata
              </Title>
              <Text
                className={`${montserrat_paragraph.variable} mb-2 font-montserratParagraph text-white/90`}
              >
                Enter a prompt to generate metadata for your documents
              </Text>
              <Textarea
                placeholder="e.g., Generate metadata for all PDF documents..."
                minRows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`${montserrat_paragraph.variable} mb-4 font-montserratParagraph`}
                styles={{
                  input: {
                    backgroundColor: '#1A1B1E',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  },
                }}
              />
              <div className="-inset-0.25 relative w-fit animate-[rotating_3s_linear_infinite] rounded-3xl bg-[conic-gradient(from_var(--r),#312e81_0%,#4f46e5_10%,#312e81_20%)] p-0.5">
                <Button
                  className="relative transform rounded-3xl bg-purple-800 text-white hover:border-indigo-600 hover:bg-indigo-600"
                  onClick={() => generateMetadataMutation()}
                  loading={isGenerating}
                  leftIcon={<IconRefresh size={16} />}
                >
                  Generate
                </Button>
              </div>
            </Card>

            {/* Results Table */}
            {hasLatestResults && latestResults && (
              <Card className="bg-black/20">
                <Flex justify="space-between" align="center" mb="md">
                  <Title
                    order={4}
                    className={`${montserrat_heading.variable} font-montserratHeading text-white/90`}
                  >
                    Latest Results
                  </Title>
                  <div className="-inset-0.25 relative w-fit animate-[rotating_3s_linear_infinite] rounded-3xl bg-[conic-gradient(from_var(--r),#312e81_0%,#4f46e5_10%,#312e81_20%)] p-0.5">
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => exportToCSV(latestResults)}
                      leftIcon={<IconDownload size={16} />}
                      className="relative transform rounded-3xl bg-purple-800 text-white hover:border-indigo-600 hover:bg-indigo-600"
                    >
                      Export CSV
                    </Button>
                  </div>
                </Flex>

                <ScrollArea>
                  <Table>
                    <thead>
                      <tr>
                        {headers.map((header) => (
                          <th key={header} className="text-white/90">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latestResults.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="text-white/80">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </div>
        </div>

        {/* Right Panel - History */}
        <div
          style={{
            flex: isSmallScreen ? '1 1 100%' : '1 1 40%',
            backgroundColor: '#15162c',
            color: 'white',
          }}
          className="p-4 sm:p-6"
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
            {isLoadingRuns ? (
              <Text color="dimmed">Loading runs...</Text>
            ) : runs.length === 0 ? (
              <Text color="dimmed">No previous runs</Text>
            ) : (
              runs.map((run) => (
                <Card key={run.id} className="mb-3 bg-black/20" radius="md">
                  <Text size="sm" color="dimmed">
                    {new Date(run.timestamp).toLocaleString()}
                  </Text>
                  <Text className="mt-2 line-clamp-2" size="sm">
                    {run.prompt}
                  </Text>
                  <Flex justify="space-between" align="center" mt="xs">
                    <Text
                      size="xs"
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
                    {run.results &&
                      run.results.length > 0 &&
                      run.results[0] && (
                        <Tooltip label="Download CSV">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => exportToCSV(run.results)}
                            className="text-white hover:text-indigo-400"
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                  </Flex>
                </Card>
              ))
            )}
          </ScrollArea>
        </div>
      </Flex>
    </Card>
  )
}
