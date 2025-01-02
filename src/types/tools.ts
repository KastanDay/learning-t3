export interface OpenAICompatibleTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters?: {
      type: 'object'
      properties: {
        [key: string]: {
          type: 'string' | 'number' | 'Boolean'
          description?: string
          enum?: string[]
        }
      }
      required: string[]
    }
  }
}

// conform to the OpenAI function calling API
export interface FormField {
  fieldLabel: string
  fieldType?: string
  requiredField?: boolean
}

export interface FormNodeParameter {
  formFields: {
    values: FormField[]
  }
  formDescription: string
}

export interface Node {
  id: string
  name: string
  parameters: FormNodeParameter
  type: string
}

export interface N8nWorkflow {
  id: string
  name: string
  type: string
  active: boolean
  nodes: Node[]
  createdAt: string
  updatedAt: string
}

export interface N8NParameter {
  type: 'string' | 'textarea' | 'number' | 'Date' | 'DropdownList' | 'Boolean'
  description: string
  enum?: string[]
}
