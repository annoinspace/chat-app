import { useEffect, useState, ChangeEvent } from "react"
import { Container, Row, Col, Form, FormControl, ListGroup } from "react-bootstrap"
import { Message, User } from "../types"
import { io } from "socket.io-client"

// 1. When we jump into this page, the socket.io client needs to connect to the server
// 2. If the connection happens successfully, the server will emit an event called "welcome"
// 3. If we want to do something when that event happens we shall LISTEN to that event by using socket.on("welcome")
// 4. Once we are connected we want to submit the username to the server --> we shall EMIT an event called "createAndSetUsername" (containing the username itself as payload)
// 5. The server is listening for the "createAndSetUsername" event, when that event is fired the server will broadcast that username to whoever is listening for an event called "loggedIn"
// 6. If a client wants to display the list of online users, it should listen for the "loggedIn" event
// 7. In this way the list of online users is updated only during login, but what happens if a new user joins? In this case we are not updating the list
// 8. When a new user joins server emits another event called "updateOnlineUsersList", this is supposed to update the list when somebody joins or leaves. Clients they should listen for the "updateOnlineUsersList" event to update the list when somebody joins or leaves
// 9. When the client sends a message we should trigger a "sendMessage" event
// 10. Server listens for that and then it should broadcast that message to everybody but the sender by emitting an event called "newMessage"
// 11. Anybody who is listening for a "newMessage" event will display that in the chat

const socket = io("http://localhost:3001", { transports: ["websocket"] })
// if you don't specify the transport ("websocket") socket.io will try to connect to the server by using Polling (old technique)

const Home = () => {
  const [username, createAndSetUsername] = useState("")
  const [message, setMessage] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    socket.on("welcome", (welcomeMessage) => {
      console.log(welcomeMessage)

      socket.on("loggedIn", (onlineUsersList) => {
        console.log("logged in event:", onlineUsersList)
        setLoggedIn(true)
        setOnlineUsers(onlineUsersList)
      })

      socket.on("updateOnlineUsersList", (onlineUsersList) => {
        console.log("A new user connected/disconnected")
        setOnlineUsers(onlineUsersList)
      })
      // socket.on("chatHistory", (chatHistory) => {
      //   console.log("Received chat history:", chatHistory)
      //   setChatHistory(chatHistory)
      // })
      socket.on("newMessage", (newMessage) => {
        console.log(newMessage)
        setChatHistory((prevChatHistory) => [...prevChatHistory, newMessage.message])
      })
    })
    socket.on("typing", (typingUsers) => {
      setTypingUsers(typingUsers)
    })

    socket.on("stopTyping", ({ username }: { username: string }) => {
      setTypingUsers((prevTypingUsers) => prevTypingUsers.filter((user) => user !== username))
    })
  })

  const submitUsername = () => {
    // here we will be emitting a "createAndSetUsername" event (the server is already listening for that)
    setLoggedIn(true)
    socket.emit("createAndSetUsername", { username })
    console.log("username", username)
  }
  const setMessageHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    console.log("logging the message in handler", message)
    console.log("logging the user who is typing", username)
    console.log(typeof username)
    if (!typingUsers.includes(username)) {
      setTypingUsers((prevTypingUsers) => [...prevTypingUsers, username])
      socket.emit("typing", { username })
    }

    setTimeout(() => {
      setTypingUsers((prevTypingUsers) => prevTypingUsers.filter((user) => user !== username))
    }, 5000)
  }
  const sendMessage = () => {
    const newMessage: Message = {
      sender: username,
      text: message,
      createdAt: new Date().toLocaleString("en-UK")
    }
    socket.emit("sendMessage", { message: newMessage })
    setChatHistory([...chatHistory, newMessage])
    socket.emit("chatHistory", chatHistory)
    console.log("chat history after emit", chatHistory)
    setTypingUsers((prevTypingUsers) => prevTypingUsers.filter((user) => user !== username))
  }

  return (
    <Container fluid>
      <Row style={{ height: "95vh" }} className="my-3">
        <Col md={9} className="d-flex flex-column justify-content-between">
          {/* LEFT COLUMN */}
          {/* TOP AREA: USERNAME INPUT FIELD */}
          <Form
            onSubmit={(e) => {
              e.preventDefault()
              submitUsername()
            }}
          >
            <FormControl
              placeholder="Set your username here"
              value={username}
              onChange={(e) => createAndSetUsername(e.target.value)}
              disabled={loggedIn}
            />
          </Form>
          {/* )} */}
          {/* MIDDLE AREA: CHAT HISTORY */}
          <ListGroup>
            {chatHistory.map((message, index) => (
              <ListGroup.Item key={index}>
                {<strong>{message.sender}</strong>} | {message.text} at {message.createdAt}
              </ListGroup.Item>
            ))}
          </ListGroup>
          {/* BOTTOM AREA: NEW MESSAGE */}
          {typingUsers.filter((user) => user !== username).length > 0 && (
            <div>
              {typingUsers.length === 2
                ? `${typingUsers.filter((user) => user !== username)[0]} is typing...`
                : `${typingUsers.filter((user) => user !== username).join(", ")} are typing...`}
            </div>
          )}

          <Form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
          >
            <FormControl
              placeholder="Write your message here"
              value={message}
              // onChange={(e) => setMessage(e.target.value)}
              onChange={setMessageHandler}
              disabled={!loggedIn}
            />
          </Form>
        </Col>
        <Col md={3}>
          {/* ONLINE USERS SECTION */}
          <div className="mb-3">Connected users:</div>
          {onlineUsers.length === 0 && <ListGroup.Item>Log in to check who is online!!</ListGroup.Item>}
          <ListGroup>
            {onlineUsers.map((user) => (
              <ListGroup.Item key={user.socketId}>{user.username}</ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
