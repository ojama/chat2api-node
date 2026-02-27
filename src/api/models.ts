export const modelProxy: Record<string, string> = {
  'gpt-3.5-turbo': 'gpt-3.5-turbo-0125',
  'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k-0613',
  'gpt-4': 'gpt-4-0613',
  'gpt-4-32k': 'gpt-4-32k-0613',
  'gpt-4-turbo-preview': 'gpt-4-0125-preview',
  'gpt-4-vision-preview': 'gpt-4-1106-vision-preview',
  'gpt-4-turbo': 'gpt-4-turbo-2024-04-09',
  'gpt-4o': 'gpt-4o-2024-08-06',
  'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
  'o1-preview': 'o1-preview-2024-09-12',
  'o1-mini': 'o1-mini-2024-09-12',
  'o1': 'o1-2024-12-18',
  'o3-mini': 'o3-mini-2025-01-31',
  'o3-mini-high': 'o3-mini-high-2025-01-31',
};

export const modelSystemFingerprint: Record<string, string[]> = {
  'gpt-3.5-turbo-0125': ['fp_b28b39ffa8'],
  'gpt-4-0125-preview': ['fp_f38f4d6482', 'fp_2f57f81c11'],
  'gpt-4-turbo-2024-04-09': ['fp_d1bac968b4'],
  'gpt-4o-2024-05-13': ['fp_3aa7262c27'],
  'gpt-4o-mini-2024-07-18': ['fp_c9aa9c0491'],
};
