import axios from "axios";

interface DownloadResult {
  message: string;
}

export const downloadConversationHistory = async (courseName: string): Promise<DownloadResult> => {
  try {
    const response = await axios.get(
      `https://flask-production-751b.up.railway.app/export-convo-history-csv?course_name=${courseName}`,
      { responseType: 'blob' },
    )

    if (response.headers['content-type'] === 'application/json') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
          const jsonData = JSON.parse(reader.result as string);
          if (jsonData.response === "Download from S3") {
            resolve({
              message: "We have started gathering your conversation history, you will receive an email shortly.",
            });
          } else {
            resolve({ message: "Your conversation history is ready for download." });
          }
        }
        reader.onerror = reject;
        reader.readAsText(new Blob([response.data]));
      });
    } else if (response.headers['content-type'] === 'application/zip') {
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', courseName + '_conversation_history.zip')
      document.body.appendChild(link)
      link.click()
      return { message: "Your download will start shortly." };
    }
  } catch (error) {
    console.error('Error exporting documents:', error)
    return { message: 'Error exporting documents.' };
  }
  return { message: 'Unexpected error occurred.' };
}
//   }
//     } else {
//       const url = window.URL.createObjectURL(new Blob([response.data]))
//       const link = document.createElement('a')
//       link.href = url
//       link.setAttribute('download', courseName + '_conversation_history.csv')
//       document.body.appendChild(link)
//       link.click()
//       return { message: "Your download will start shortly." };
//     }
//   } catch (error) {
//     console.error('Error fetching conversation history:', error)
//     return { message: 'Error fetching conversation history.' };
//   }
// }