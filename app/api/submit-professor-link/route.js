import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

export async function POST(req) {
  const { link } = await req.json();

  try {
    // Fetch the HTML content of the professor's page
    const response = await fetch(link);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract the professor's name from the meta tag
    const professorName = $('meta[name="title"]').attr('content').split(' at ')[0].trim();

    // Extract the star rating
    const stars = $('div.RatingValue__Numerator-qw8sqy-2.liyUjw').text().trim();

    // Extract the subject (department)
    const subject = $('a.TeacherDepartment__StyledDepartmentLink-fl79e8-0.iMmVHb b').text().trim();

    // Initialize an empty array for reviews
    const reviews = [];

    // Extract reviews using the provided structure
    $('div.Comments__StyledComments-dzzyvm-0.gRjWel').each((i, elem) => {
      const reviewText = $(elem).text().trim();
      reviews.push({ reviewText });
    });

    console.log("Scraped Data:", { professorName, stars, subject, reviews });

    // If no reviews are found, throw an error
    if (!professorName || !stars || !subject || reviews.length === 0) {
      throw new Error("Failed to extract the necessary data from the page.");
    }

    // Initialize OpenAI and Pinecone clients
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('rag').namespace('ns1');

    // Process each review to create embeddings and prepare data for Pinecone
    const processedData = [];
    
    console.log("============TEST STARTS HERE============")
    for (const review of reviews) {
      const embeddingResponse = await openai.embeddings.create({
        input: review.reviewText,
        model: 'text-embedding-3-small',
      });
      const embedding = embeddingResponse.data[0].embedding;
      processedData.push({
        id: `${professorName}-${Math.random().toString(36).substr(2, 9)}`,  // Unique identifier for each review
        values: embedding,  // The embedding values
        metadata: {
          review: review.reviewText,
          stars: stars,
          subject: subject,
        },
      });
    }

    // Ensure processedData is an array and pass it correctly
    if (Array.isArray(processedData) && processedData.length > 0) {
      console.log("EXECUTED")
      await index.upsert(processedData);
    } else {
      throw new Error("No data to upsert into Pinecone.");
    }

    const stats = await index.describeIndexStats();
    console.log(stats)

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
