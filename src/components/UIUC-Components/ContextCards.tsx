import { env } from '~/env.mjs'

import {
  Card,
  Image,
  Text,
  Title,
  Badge,
  MantineProvider,
  Button,
  Group,
  Stack,
  createStyles,
  FileInput,
  rem,
} from '@mantine/core'

import React, { useState, useEffect } from 'react'
import { fetchContexts, getTopContextsResponse } from '~/pages/api/getContexts'
import Link from 'next/link'


export const BuildContextCards = () => {
  const [contexts, setContexts] = useState<getTopContextsResponse[]>();

  useEffect(() => {
    fetchContexts().then((data) => {
      setContexts(data);
    });
  }, []);

  return (
    <>
      {contexts ? (
        contexts.map((context: getTopContextsResponse, index: number) => (
          <DynamicMaterialsCard
            key={context.id || index}
            id={context.id || index} // Add fallback key using index. Not sure why we need a key and an ID.... bad code.
            source_name={context.source_name}
            source_location={context.source_location}
            text={context.text}
          />
        ))
      ) : (
        // <p>Loading...</p>

        <div role="status" className="max-w-sm p-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700">
            <div className="flex items-center justify-center h-48 mb-4 bg-gray-300 rounded dark:bg-gray-700">
                <svg className="w-12 h-12 text-gray-200 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor" viewBox="0 0 640 512"><path d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z"/></svg>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"></div>
            <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
            <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
            <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            <div className="flex items-center mt-4 space-x-3">
                <svg className="text-gray-200 w-14 h-14 dark:text-gray-700" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path></svg>
                <div>
                    <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></div>
                    <div className="w-48 h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
                </div>
            </div>
            <span className="sr-only">Loading...</span>
        </div>

      )}
    </>
  );
};

function DynamicMaterialsCard({ source_name, source_location, text }: getTopContextsResponse) {
  return (
    <div className="box-sizing: border-box; border: 100px solid #ccc;">
      <Card
        bg="#0E1116"
        style={{ maxWidth: '20rem' }}
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
      >
        <Card.Section>
          <Image
            src="https://images.unsplash.com/photo-1527004013197-933c4bb611b3?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=720&q=80"
            height={'7rem'}
            alt="Norway"
          />
        </Card.Section>

        <Group position="apart" mt="xs" mb="xs">
          <Text style={{ fontFamily: 'Montserrat' }} size="md" weight={600}>
            {source_name}
          </Text>
        </Group>

        <Link
          href={'https://kastanday.com'}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Group>
            {/* <IconExternalLink size={20} strokeWidth={2} color={'white'} /> */}
            <Text
              size="xs"
              variant="dimmed"
              weight={4300}
              // gradient={{ from: 'yellow', to: 'green', deg: 0 }}
            >
              {/* Source {source_location} */}
              Page 11
            </Text>
          </Group>
        </Link>

        <Text
          size="sm"
          variant="gradient"
          weight={600}
          gradient={{ from: 'yellow', to: 'green', deg: 0 }}
        >
          AI summary
        </Text>
        <Text className="fade" size="md" color="dimmed">
          {text}
        </Text>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="xs" variant="dimmed" pb="0">
            Show full paragraph
          </Button>
        </div>
      </Card>
    </div>
  )
}
