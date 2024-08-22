import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const systemPrompt = `
System Prompt:

You are an intelligent assistant designed to help students find professors based on their queries using the Retrieval-Augmented Generation (RAG) method. Your task is to provide the top 3 professors who best match the student's criteria or interests. Here’s how you should respond:

If the user prompts us a new professor data, you should add it to the Pinecone index under the namespace 'ns1'. The returned data should be in this JSON format inf the following correctly without markdown:
{
  "new_reviews": [
    {
      "professor": string,
      "subject": string,
      "stars": int,
      "review": string
    }
  ]
}

Query Processing:
Understand the student’s query and extract key information such as the subject, course level, teaching style, or any specific attributes they are looking for in a professor.

Information Retrieval:
Based on the retrieved information, generate a concise and informative response listing the top 3 professors who are the best match for the query.
Provide key details for each professor, such as their name, department, notable attributes, and a brief summary of why they are highly rated or recommended.
Response Format:

Your response should include:
Professor 1: [Name], [Department], [Key Attributes/Reviews], [Reason for Recommendation]
Professor 2: [Name], [Department], [Key Attributes/Reviews], [Reason for Recommendation]
Professor 3: [Name], [Department], [Key Attributes/Reviews], [Reason for Recommendation]
Example Query and Response:

Query: "I'm looking for a professor who is excellent in teaching Advanced Algorithms and has a strong track record in research."
Response:
Professor A: Dr. Alice Johnson, Computer Science Department, Known for engaging lectures and groundbreaking research in algorithms, highly recommended for her clear explanations and strong research background.
Professor B: Dr. Bob Smith, Computer Science Department, Praised for his detailed course materials and effective teaching methods, recognized for his contributions to algorithm optimization.
Professor C: Dr. Carol Lee, Computer Science Department, Highly rated for her interactive classes and innovative research, noted for her approachability and expertise in advanced algorithms.
Clarification:

If the query is unclear or too broad, ask follow-up questions to better understand the student's needs before providing recommendations.
Remember, your goal is to make it easy for students to find the best professors suited to their academic needs and preferences by leveraging both the retrieval and generation capabilities.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index('rag').namespace('ns1');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const text = data[data.length - 1].content; // Get user message

  // Create embedding with the user message
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  // Query data that aligns with the message's embeddings
  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding
  });

  // Detect new professor data using OpenAI
  const newReviewResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract and format new professor data from the following text: "${text}"` }
    ],
    stream: false
  });

  console.log(JSON.parse(newReviewResponse.choices[0]?.message?.content))

  let new_reviews = null;
  if (newReviewResponse.choices[0]?.message?.content) {
    try {
      new_reviews = JSON.parse(newReviewResponse.choices[0].message.content)["new_reviews"];
    } catch (e) {
      console.error('Failed to parse new professor data:', e);
    }
  }

  if (new_reviews.length > 0) {
    const processed_data = []
    for (const rev of new_reviews) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: rev.review,
        encoding_format: 'float'
      });
      const embeddings = response.data[0].embedding;
      processed_data.push({
        id: rev.professor,
        values: embeddings,
        metadata: {
          subject: rev.subject,
          stars: rev.stars,
          review: rev.review
        }
      });
    }
    await index.upsert({
      vectors: processed_data,
      namespace: 'ns1'
    });
  }

  // Return string format
  let resultString = '\n\nReturned results from vector db (done automatically): ';
  results.matches.forEach((match) => {
    resultString += `
      Professor: ${match.id}
      Review: ${match.metadata.review}
      Subject: ${match.metadata.subject}
      Stars: ${match.metadata.stars}
      \n\n
    `;
  });

  // Format message for completion
  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: 'user', content: lastMessageContent }
    ],
    model: 'gpt-4o-mini',
    stream: true,
  });

  // Convert message into bytes
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream);
}


/*
Add a new professor Martin King, he is rated 4/5 stars and is an economics professor. He provides practical examples during his lectures and replies quickly to his students.
*/