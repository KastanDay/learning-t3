// import { kv } from '@vercel/kv';

// export const config = {
//   runtime: 'edge',
// }
// export default (req) => new Response('Hello world!') how to use it.

// export async function checkIfCourseExists( course_name: string) {
//   // It'll return True for existing, and null for non-existing. False for errors.
//   // View storage: https://vercel.com/uiuc-chatbot-team/uiuc-chat/stores/kv/store_VAj1mEGlDPewhKM1/cli
//   try {
//     const courseExists = await kv.get(course_name);
//     return courseExists as boolean;
//   } catch (error) {
//     console.log(error)
//     return false;
//   }
// }

import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const getCourseExists = async (req: any, res: any) => {
  const course_name = req.nextUrl.searchParams.get('course_name')

  try {
    console.log("Request to check if course exists:", course_name)
    const courseExists = await kv.hexists('course_metadatas', course_name)
    return NextResponse.json(courseExists === 1)
  } catch (error) {
    console.log(error)
    return NextResponse.json(false)
  }
}

export default getCourseExists
