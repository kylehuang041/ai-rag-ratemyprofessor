"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Toolbar,
  AppBar,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import LinkIcon from "@mui/icons-material/Link";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const theme = createTheme({
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
  palette: {
    primary: {
      main: "#1E88E5",
    },
    secondary: {
      main: "#424242",
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [professorLink, setProfessorLink] = useState("");
  const [showProfessorInput, setShowProfessorInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages, 
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, { role: "user", content: message }]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      reader.read().then(function processText({ done, value }) {
        if (done) {
          setLoading(false);
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });

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
    } catch (error) {
      setLoading(false);
      setError("Failed to send the message. Please try again.");
      setShowError(true);
    }
  };

  const submitProfessorLink = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/submit-professor-link", {
        method: "POST",
        headers: {
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
      setShowProfessorInput(false);
    } catch (error) {
      setError("Failed to submit the professor link. Please try again.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
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
        sx={{
          background: "linear-gradient(135deg, #E3F2FD 30%, #BBDEFB 70%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Abstract shapes for the background */}
        <Box
          sx={{
            position: "absolute",
            top: "-50px",
            left: "-100px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.3)",
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-80px",
            right: "-120px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.3)",
            zIndex: 1,
          }}
        />

        <Stack
          direction="column"
          width="100%"
          maxWidth="600px"
          height="700px"
          borderRadius={2}
          boxShadow={3}
          p={3}
          spacing={3}
          bgcolor="white"
          sx={{ zIndex: 2, position: "relative" }}
        >
          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
                pr={message.role === "assistant" ? 4 : 0}
                pl={message.role !== "assistant" ? 4 : 0}
                width="100%"
                boxSizing="border-box"
              >
                <Box
                  bgcolor={message.role === "assistant" ? theme.palette.primary.main : theme.palette.secondary.main}
                  color="white"
                  borderRadius={16}
                  p={2}
                  maxWidth="80%"
                >
                  {message.content}
                </Box>
              </Box>
            ))}
            {loading && (
              <Box display="flex" justifyContent="center" mt={2}>
                <CircularProgress />
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={sendMessage}
              disabled={loading}
            >
              Send
            </Button>
          </Stack>

          {!showProfessorInput && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowProfessorInput(true)}
            >
              Add Professor
            </Button>
          )}

          {showProfessorInput && (
            <Stack direction="row" spacing={2} mt={2}>
              <TextField
                label="Professor Link"
                fullWidth
                value={professorLink}
                onChange={(e) => setProfessorLink(e.target.value)}
              />
              <Button
                variant="contained"
                endIcon={<LinkIcon />}
                onClick={submitProfessorLink}
                disabled={loading}
              >
                Submit
              </Button>
              <IconButton onClick={() => setShowProfessorInput(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          )}
        </Stack>

        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
        >
          <Alert severity="error" onClose={() => setShowError(false)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
