import OpenAI from "openai";

const apiKey = process.env.NEXT_PUBLIC_API_KEY;

if (!apiKey) {
  throw new Error("The OpenAI API key is missing. Please set the NEXT_PUBLIC_API_KEY environment variable.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const analyzeContract = async (
  contract: string,
  setResults: (results: any) => void,
  setLoading: (loading: boolean) => void,
  auditSmartContract: any
) => {
  setLoading(true);
  let retries = 5;
  let delayTime = 1000; // Start with a 1-second delay

  while (retries > 0) {
    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Your role and goal is to be an AI Smart Contract Auditor. Your job is to perform an audit on the given smart contract. Here is the smart contract: ${contract}.
    
            Please provide the results in the following array format for easy front-end display:

            [
              {
                "section": "Audit Report",
                "details": "A detailed audit report of the smart contract, covering security, performance, and any other relevant aspects."
              },
              {
                "section": "Metric Scores",
                "details": [
                  {
                    "metric": "Security",
                    "score": 0-10
                  },
                  {
                    "metric": "Performance",
                    "score": 0-10
                  },
                  {
                    "metric": "Other Key Areas",
                    "score": 0-10
                  },
                  {
                    "metric": "Gas Efficiency",
                    "score": 0-10
                  },
                  {
                    "metric": "Code Quality",
                    "score": 0-10
                  },
                  {
                    "metric": "Documentation",
                    "score": 0-10
                  }
                ]
              },
              {
                "section": "Suggestions for Improvement",
                "details": "Suggestions for improving the smart contract in terms of security, performance, and any other identified weaknesses."
              }
            ]
            
            Thank you.`,
          },
        ],
        model: "gpt-3.5-turbo",
      });

      if (chatCompletion.choices && chatCompletion.choices[0] && chatCompletion.choices[0].message) {
        const content = chatCompletion.choices[0].message.content;
        try {
          const auditResults = JSON.parse(content || '');
          setResults(auditResults);
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          setResults(null);
        }
      } else {
        console.error('Unexpected response structure:', chatCompletion);
        setResults(null);
      }
      
      setLoading(false);
      break; // Exit loop if successful
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.error('Rate limit exceeded. Retrying after delay...');
        await delay(delayTime);
        delayTime *= 2; // Double the delay for the next retry
        retries--;
      } else {
        console.error('An error occurred:', error);
        setLoading(false);
        throw error; // Re-throw other errors
      }
    }
  }

  if (retries === 0) {
    console.error('Failed to complete request after multiple retries.');
    setLoading(false);
  }
};

export const fixIssues = async (
  contract: string,
  suggestions: string,
  setContract: (contract: string) => void,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);

  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Here is the smart contract with the following issues: ${suggestions}. Please provide a fixed version of the contract:\n\n${contract}`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    if (response.choices && response.choices[0] && response.choices[0].message) {
      const fixedContract = response.choices[0].message.content;
      setContract(fixedContract?.trim() || '');
    } else {
      console.error('Unexpected response structure:', response);
      setContract('');
    }
  } catch (error) {
    console.error('An error occurred while fixing issues:', error);
  } finally {
    setLoading(false);
  }
};
