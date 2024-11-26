// qdrantUtils.ts
import { CourseDocument } from '~/types/courseMaterials'
import { qdrant } from '@/utils/qdrantClient'
import posthog from 'posthog-js'

const collection_name = process.env.QDRANT_COLLECTION_NAME

// Uncomment to test collection schema:
// async function getCollectionSchema(collectionName: string) {
//   try {
//     const response = await qdrant.getCollection(collectionName);
//     return response;
//   } catch (error) {
//     console.error('Error retrieving collection schema:', error);
//     throw error;
//   }
// }

export async function addDocumentsToDocGroupQdrant(
  courseName: string,
  doc: CourseDocument,
) {
  try {
    // Uncomment with function definition to test collection schema:
    // const schema = await getCollectionSchema(collection_name ? collection_name : "");
    // console.log("Collection Schema:", schema);

    const searchFilter = {
      must: [
        {
          key: 'course_name',
          match: {
            value: courseName,
          },
        },
        ...(doc.url
          ? [
              {
                key: 'url',
                match: {
                  value: doc.url,
                },
              },
            ]
          : []),
        {
          key: 's3_path',
          match: {
            value: doc.s3_path ? doc.s3_path : '',
          },
        },
      ],
    }

    const response = await qdrant.setPayload(
      collection_name ? collection_name : '',
      {
        payload: {
          doc_groups: doc.doc_groups,
        },
        filter: searchFilter,
      },
    )

    // console.log('Successfully added documents to doc group: ', response)
    return response
  } catch (error) {
    console.error('Error in addDocumentsToDocGroup:', error)

    posthog.capture('add_doc_group', {
      course_name: courseName,
      doc_readable_filename: doc.readable_filename,
      doc_unique_identifier:
        doc.url && doc.url !== ''
          ? doc.url
          : doc.s3_path && doc.s3_path !== ''
            ? doc.s3_path
            : null,
      doc_groups: doc.doc_groups,
      error_logs: error,
    })

    throw error
  }
}
