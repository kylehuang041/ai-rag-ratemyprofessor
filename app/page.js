"use client";

import { useState } from "react";
import { Box, Stack, TextField, Button, Toolbar, AppBar, Typography } from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [professorLink, setProfessorLink] = useState("");

  // Function to send a message
  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages, 
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    // Reset the input field
    setMessage("");

    // Send message to the API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });

        // Update messages with the complete response
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1];
          const otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };

  const submitProfessorLink = async () => {
    const response = await fetch("/api/submit-professor-link", {
      method: "POST",
      heards: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link: professorLink }),
    });

    if (response.ok) {
      alert("Professor link submitted successfully");
    } else {
      alert("Failed to submit professor link");
    }

    setProfessorLink("");
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Rate My Professor AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        width="100vw"
        height="calc(100vh - 64px)"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        p={2}
        overflow="hidden"
      >
        <Stack
          direction="column"
          width="100%"
          maxWidth="600px"
          height="700px"
          border="1px solid black"
          p={2}
          spacing={3}
          overflow="hidden"
        >
          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            overflow="auto"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === "assistant" ? "flex-start" : "flex-end"
                }
                pr={
                  message.role === "assistant" ? 4 : 0
                }
                pl={
                  message.role !== "assistant" ? 4 : 0
                }
                width="100%"
                boxSizing="border-box"
              >
                <Box
                  bgcolor={
                    message.role === "assistant"
                      ? "primary.main"
                      : "secondary.main"
                  }
                  color="white"
                  borderRadius={16}
                  p={2}
                  maxWidth="80%"
                >
                  {message.content}
                </Box>
              </Box>
            ))}
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" onClick={sendMessage}>
              Send
            </Button>
          </Stack>
          <Stack direction="row" spacing={2} mt={2}>
            <TextField
              label="RateMyProfessor Profile URL"
              fullWidth
              value={professorLink}
              onChange={(e) => setProfessorLink(e.target.value)}
            />
            <Button variant="contained" onClick={submitProfessorLink}>
              Submit
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
