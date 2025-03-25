export default () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genius System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"></script>
    <style>
        /* General Styles */
        body {
            font-family: 'Arial', sans-serif;
            background-color: #121212;
            color: #ffffff;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        header {
            background-color: #1f1f1f;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        header h1 {
            margin: 0;
            font-size: 24px;
        }

        main {
            display: flex;
            min-height: calc(100vh - 100px);
        }

        .sidebar {
            width: 250px;
            padding: 20px;
            background: #1f1f1f;
            border-right: 1px solid #333;
            overflow-y: auto;
        }

        .content {
            flex: 1;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* View Management */
        .view {
            display: none;
            width: 100%;
            max-width: 600px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .view.active {
            display: block;
            opacity: 1;
        }

        /* Forms and Inputs */
        form {
            display: flex;
            flex-direction: column;
            gap: 15px;
            background: #1f1f1f;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.5s ease;
        }

        input, button {
            padding: 12px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
        }

        input {
            background: #333;
            color: #fff;
        }

        button {
            background-color: #007bff;
            color: #ffffff;
            cursor: pointer;
            transition: background-color 0.3s ease, transform 0.2s ease;
        }

        button:hover {
            background-color: #0056b3;
            transform: scale(1.02);
        }

        button:active {
            transform: scale(0.98);
        }

        a {
            color: #00bcd4;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        /* Conversations */
        .convo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 5px;
            margin-bottom: 10px;
            cursor: pointer;
        }

        .convo-item.selected {
            background: #333;
        }

        .convo-item span {
            flex: 1;
        }

        .convo-item button {
            background: #dc3545;
            padding: 5px 10px;
            font-size: 14px;
        }

        /* Messages Area */
        #messages {
            height: 400px;
            overflow-y: auto;
            border: 1px solid #333;
            padding: 15px;
            margin: 10px 0;
            background: #1f1f1f;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message {
            position: relative;
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 10px;
            animation: fadeIn 0.3s ease;
        }

        .message.user {
            align-self: flex-end;
            background: #007bff;
            color: #fff;
        }

        .message.assistant {
            align-self: flex-start;
            background: #28a745;
            color: #fff;
        }

        .message button {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #ffc107;
            color: #000;
            padding: 2px 5px;
            font-size: 12px;
        }

        /* Animations */
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 767px) {
            main {
                flex-direction: column;
            }
            .sidebar {
                display: none;
            }
            .content {
                padding: 10px;
            }
            .view {
                max-width: 100%;
            }
        }

        @media (min-width: 768px) {
            .sidebar {
                display: block;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>Genius System</h1>
        <div id="user-info">
            <span id="user-email"></span>
            <button id="logout" style="display: none;">Logout</button>
        </div>
    </header>
    <main>
        <div class="sidebar">
            <h2>Conversations</h2>
            <button id="create-convo">New Conversation</button>
            <button id="clear-all">Clear All</button>
            <div id="convo-list"></div>
        </div>
        <div class="content">
            <!-- Login View -->
            <div class="view view-login">
                <h2>Login</h2>
                <form id="login-form">
                    <input type="email" id="login-email" placeholder="Email" required>
                    <input type="password" id="login-password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
                <p>Don't have an account? <a href="#" id="to-register">Register</a></p>
            </div>

            <!-- Register View -->
            <div class="view view-register">
                <h2>Register</h2>
                <form id="register-form">
                    <input type="email" id="register-email" placeholder="Email" required>
                    <input type="password" id="register-password" placeholder="Password" required>
                    <button type="submit">Register</button>
                </form>
                <p>Already have an account? <a href="#" id="to-login">Login</a></p>
            </div>

            <!-- Verify Email View -->
            <div class="view view-verify">
                <h2>Verify Email</h2>
                <form id="verify-form">
                    <input type="email" id="verify-email" placeholder="Email" required>
                    <input type="text" id="verify-code" placeholder="Verification Code" required>
                    <button type="submit">Verify</button>
                </form>
                <button id="resend-code">Resend Verification Code</button>
            </div>

            <!-- Dashboard View -->
            <div class="view view-dashboard">
                <p>Select a conversation from the list or create a new one.</p>
            </div>

            <!-- Conversation View -->
            <div class="view view-conversation">
                <h2>Conversation</h2>
                <button id="back-to-dashboard">Back to Dashboard</button>
                <div id="messages"></div>
                <form id="send-form">
                    <input type="text" id="message-input" placeholder="Type your message" required>
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    </main>

    <script>
        const showdownConverter = new showdown.Converter();

        // Application State
        const state = {
            currentView: 'login',
            token: null,
            user: null,
            conversations: [],
            selectedConvo: null,
            messages: [],
        };

        // Utility Functions
        function setView(viewName, convoId = null) {
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.querySelector(\`.view-\${viewName}\`).classList.add('active');
            state.currentView = viewName;
            if (viewName === 'conversation' && convoId) {
                window.location.hash = \`#convo-\${convoId}\`;
            } else {
                window.location.hash = \`#\${viewName}\`;
            }
        }

        function updateUserInfo() {
            const userEmailSpan = document.getElementById('user-email');
            const logoutButton = document.getElementById('logout');
            if (state.user) {
                userEmailSpan.textContent = state.user.email;
                logoutButton.style.display = 'inline';
            } else {
                userEmailSpan.textContent = '';
                logoutButton.style.display = 'none';
            }
        }

        // Event Handlers
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    state.token = data.token;
                    state.user = { email };
                    localStorage.setItem('token', data.token);
                    updateUserInfo();
                    setView('dashboard');
                    loadConversations();
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('An error occurred during login');
            }
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Registration successful. Please check your email for verification code.');
                    document.getElementById('verify-email').value = email;
                    setView('verify');
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Register error:', err);
                alert('An error occurred during registration');
            }
        });

        document.getElementById('verify-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('verify-email').value;
            const code = document.getElementById('verify-code').value;
            try {
                const response = await fetch('/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Email verified successfully. You can now login.');
                    setView('login');
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Verify error:', err);
                alert('An error occurred during verification');
            }
        });

        document.getElementById('resend-code').addEventListener('click', async () => {
            const email = document.getElementById('verify-email').value;
            try {
                const response = await fetch('/resend-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Verification code resent. Please check your email.');
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Resend code error:', err);
                alert('An error occurred while resending the code');
            }
        });

        document.getElementById('create-convo').addEventListener('click', async () => {
            const title = prompt('Enter conversation title:');
            if (title) {
                try {
                    const response = await fetch('/convo', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${state.token}\`,
                        },
                        body: JSON.stringify({ title }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        const newConvoId = data.id;
                        await loadConversations();
                        const newConvo = state.conversations.find(c => c.id === newConvoId);
                        if (newConvo) {
                            state.selectedConvo = newConvo.id;
                            document.querySelector('.view-conversation h2').textContent = \`Conversation: \${newConvo.title}\`;
                            loadMessages(newConvo.id);
                            setView('conversation', newConvo.id);
                            document.querySelectorAll('.convo-item').forEach(item => item.classList.remove('selected'));
                            const newItem = Array.from(document.getElementById('convo-list').children).find(item => item.textContent.includes(newConvo.title));
                            if (newItem) newItem.classList.add('selected');
                        }
                    } else {
                        alert(data.message);
                    }
                } catch (err) {
                    console.error('Create convo error:', err);
                    alert('An error occurred while creating conversation');
                }
            }
        });

        document.getElementById('clear-all').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete all conversations?')) {
                try {
                    const response = await fetch('/convo/all', {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${state.token}\` },
                    });
                    if (response.ok) {
                        loadConversations();
                        state.selectedConvo = null;
                        setView('dashboard');
                    } else {
                        const data = await response.json();
                        alert(data.message);
                    }
                } catch (err) {
                    console.error('Clear all convos error:', err);
                    alert('An error occurred while clearing conversations');
                }
            }
        });

        document.getElementById('back-to-dashboard').addEventListener('click', () => {
            state.selectedConvo = null;
            setView('dashboard');
        });

        document.getElementById('send-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('message-input').value;
            if (!message) return;

            // Display user message
            const userMsgDiv = document.createElement('div');
            userMsgDiv.className = 'message user';
            userMsgDiv.textContent = message;
            const userCopyButton = document.createElement('button');
            userCopyButton.textContent = 'Copy';
            userCopyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(message);
                alert('Message copied to clipboard');
            });
            userMsgDiv.appendChild(userCopyButton);
            document.getElementById('messages').appendChild(userMsgDiv);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;

            // Clear input
            document.getElementById('message-input').value = '';

            try {
                const response = await fetch(\`/send/\${state.selectedConvo}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${state.token}\`,
                    },
                    body: JSON.stringify({ message, stream: true }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let liveMessage = '';
                const assistantMsgDiv = document.createElement('div');
                assistantMsgDiv.className = 'message assistant';
                document.getElementById('messages').appendChild(assistantMsgDiv);

                async function read() {
                    const { done, value } = await reader.read();
                    if (done) {
                        state.messages.push({ role: 'assistant', content: liveMessage });
                        const copyButton = document.createElement('button');
                        copyButton.textContent = 'Copy';
                        copyButton.addEventListener('click', () => {
                            navigator.clipboard.writeText(liveMessage);
                            alert('Message copied to clipboard');
                        });
                        assistantMsgDiv.appendChild(copyButton);
                        return;
                    }
                    const chunk = decoder.decode(value);
                    const events = chunk.split('\\n\\n');
                    for (const event of events) {
                        if (event.startsWith('data: ')) {
                            const data = event.substring(6);
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.message) {
                                    liveMessage += parsed.message;
                                    const html = showdownConverter.makeHtml(liveMessage);
                                    assistantMsgDiv.innerHTML = html;
                                    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
                                } else if (parsed.done) {
                                    // Stream complete
                                }
                            } catch (err) {
                                console.error('Error parsing SSE data:', err);
                            }
                        }
                    }
                    read();
                }
                read();
            } catch (err) {
                console.error('Send message error:', err);
                alert('An error occurred while sending message');
            }
        });

        document.getElementById('to-register').addEventListener('click', (e) => {
            e.preventDefault();
            setView('register');
        });

        document.getElementById('to-login').addEventListener('click', (e) => {
            e.preventDefault();
            setView('login');
        });

        document.getElementById('logout').addEventListener('click', () => {
            localStorage.removeItem('token');
            state.token = null;
            state.user = null;
            state.conversations = [];
            state.selectedConvo = null;
            state.messages = [];
            setView('login');
            updateUserInfo();
        });

        // Conversation Management
        async function loadConversations() {
            try {
                const response = await fetch('/convos', {
                    headers: { 'Authorization': \`Bearer \${state.token}\` },
                });
                const data = await response.json();
                if (response.ok) {
                    state.conversations = data;
                    renderConversations();
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Load conversations error:', err);
                alert('An error occurred while loading conversations');
            }
        }

        function renderConversations() {
            const convoList = document.getElementById('convo-list');
            convoList.innerHTML = '';
            state.conversations.forEach(convo => {
                const div = document.createElement('div');
                div.className = 'convo-item';
                if (state.selectedConvo === convo.id) {
                    div.classList.add('selected');
                }
                const titleSpan = document.createElement('span');
                titleSpan.textContent = convo.title;
                titleSpan.addEventListener('click', () => {
                    state.selectedConvo = convo.id;
                    document.querySelector('.view-conversation h2').textContent = \`Conversation: \${convo.title}\`;
                    loadMessages(convo.id);
                    setView('conversation', convo.id);
                    document.querySelectorAll('.convo-item').forEach(item => item.classList.remove('selected'));
                    div.classList.add('selected');
                });
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this conversation?')) {
                        try {
                            const response = await fetch(\`/convo/\${convo.id}\`, {
                                method: 'DELETE',
                                headers: { 'Authorization': \`Bearer \${state.token}\` },
                            });
                            if (response.ok) {
                                loadConversations();
                                if (state.selectedConvo === convo.id) {
                                    state.selectedConvo = null;
                                    setView('dashboard');
                                }
                            } else {
                                const data = await response.json();
                                alert(data.message);
                            }
                        } catch (err) {
                            console.error('Delete convo error:', err);
                            alert('An error occurred while deleting conversation');
                        }
                    }
                });
                div.appendChild(titleSpan);
                div.appendChild(deleteButton);
                convoList.appendChild(div);
            });
        }

        async function loadMessages(convoId) {
            try {
                const response = await fetch(\`/convo/\${convoId}\`, {
                    headers: { 'Authorization': \`Bearer \${state.token}\` },
                });
                const data = await response.json();
                if (response.ok) {
                    state.messages = data;
                    renderMessages();
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error('Load messages error:', err);
                alert('An error occurred while loading messages');
            }
        }

        function renderMessages() {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';
            state.messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = \`message \${msg.role}\`;
                if (msg.role === 'assistant') {
                    const html = showdownConverter.makeHtml(msg.content);
                    div.innerHTML = html;
                } else {
                    div.textContent = msg.content;
                }
                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy';
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(msg.content);
                    alert('Message copied to clipboard');
                });
                div.appendChild(copyButton);
                messagesDiv.appendChild(div);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Hash Change Handler
        function handleHashChange() {
            const hash = window.location.hash;
            if (hash.startsWith('#convo-')) {
                const convoId = hash.split('-')[1];
                if (state.conversations.find(c => c.id == convoId)) {
                    state.selectedConvo = convoId;
                    document.querySelector('.view-conversation h2').textContent = \`Conversation: \${state.conversations.find(c => c.id === convoId).title}\`;
                    loadMessages(convoId);
                    setView('conversation', convoId);
                } else {
                    setView('dashboard');
                }
            } else if (hash === '#dashboard') {
                setView('dashboard');
            } else if (hash === '#login') {
                setView('login');
            } else if (hash === '#register') {
                setView('register');
            } else if (hash === '#verify') {
                setView('verify');
            } else {
                if (state.token) {
                    setView('dashboard');
                } else {
                    setView('login');
                }
            }
        }

        // Initialization
        window.addEventListener('load', () => {
            const token = localStorage.getItem('token');
            if (token) {
                state.token = token;
                loadConversations().then(() => {
                    handleHashChange();
                });
            } else {
                setView('login');
            }
            updateUserInfo();
        });

        window.addEventListener('hashchange', handleHashChange);
    </script>
</body>
</html>`