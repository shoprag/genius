export default () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genius System</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.0/highlight.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.0/styles/github-dark.min.css">
    <!-- Font Awesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --bg-color: #1a1a1a;
            --surface-color: #242424;
            --surface-hover: #303030;
            --border-color: #444444;
            --text-color: #e0e0e0;
            --text-muted: #a0a0a0;
            --accent-color: #00aaff;
            --accent-hover: #0088cc;
            --danger-color: #ff4d4d;
            --danger-hover: #cc3d3d;
            --warning-color: #ffc107;
            --success-color: #28a745;
            --header-height: 65px;
            --font-family: 'Inter', sans-serif;
        }

        /* General Styles */
        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        body.logged-out .sidebar,
        body.logged-out #menu-toggle {
            display: none;
        }

        header {
            background-color: var(--surface-color);
            padding: 0 20px;
            height: var(--header-height);
            display: flex;
            flex-wrap: nowrap; /* Prevent wrapping */
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        #menu-toggle {
            display: none; /* Hidden by default, shown in media query */
            font-size: 24px;
            background: none;
            border: none;
            color: var(--text-color);
            cursor: pointer;
            padding: 10px;
            margin-right: 10px;
        }

        header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
        }

        #user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        #user-email {
            font-size: 14px;
            color: var(--text-muted);
        }

        main {
            display: flex;
            flex: 1; /* Takes remaining vertical space */
            overflow: hidden; /* Prevent content overflow issues */
        }

        .sidebar {
            width: 260px;
            background: var(--surface-color);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease, width 0.3s ease;
            flex-shrink: 0; /* Prevent shrinking */
        }

        .sidebar-header {
            padding: 15px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-direction: column; /* Stack title and buttons */
            gap: 10px;
        }
        .sidebar-header h2 {
            margin: 0 0 5px 0;
            font-size: 18px;
        }
        .sidebar-header-actions {
            display: flex;
            justify-content: space-between; /* Space out buttons */
            gap: 10px;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        /* Custom scrollbar for sidebar */
        .sidebar-content::-webkit-scrollbar { width: 8px; }
        .sidebar-content::-webkit-scrollbar-track { background: var(--surface-color); }
        .sidebar-content::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .sidebar-content::-webkit-scrollbar-thumb:hover { background: #555; }

        #close-sidebar {
            display: none; /* Hidden by default, shown in media query */
            width: auto;
            margin-bottom: 10px;
            align-self: flex-end; /* Position to the right */
            padding: 5px 10px;
            font-size: 18px;
        }

        .content {
            flex: 1; /* Takes remaining horizontal space */
            display: flex;
            flex-direction: column;
            align-items: center; /* Center views like login/register */
            justify-content: center; /* Center views like login/register */
            padding: 20px;
            overflow-y: auto; /* Allow content itself to scroll if needed */
        }

        .backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .backdrop.open {
            display: block;
            opacity: 1;
        }

        /* View Management */
        .view {
            display: none;
            width: 100%;
            max-width: 600px;
            opacity: 0;
            transition: opacity 0.4s ease;
            animation: fadeIn 0.4s ease forwards;
            padding: 20px 0; /* Add some vertical padding */
        }

        .view-conversation {
            max-width: 900px; /* Wider conversation view */
            display: flex;
            flex-direction: column;
            height: 100%; /* Occupy full height of content area */
            width: 100%; /* Occupy full width of content area */
            justify-content: flex-end; /* Push content to bottom initially */
            padding: 0; /* Remove padding from view itself */
        }

        .view.active {
            display: flex; /* Use flex for centering */
            flex-direction: column;
            align-items: center;
            opacity: 1;
        }
        .view-conversation.active {
            display: flex; /* Override for conversation view */
            flex-direction: column;
            align-items: stretch; /* Stretch children horizontally */
        }

        /* Login/Register Specific Styles */
        .view-login h2, .view-register h2, .view-verify h2 {
            text-align: center;
            margin-bottom: 25px;
            font-weight: 500;
        }
        .view-login p, .view-register p, .view-verify p {
            text-align: center;
            margin-top: 20px;
        }
        .view-login .welcome-text {
             text-align: center;
             margin-bottom: 30px;
             color: var(--text-muted);
             line-height: 1.6;
        }

        /* Forms and Inputs */
        form {
            display: flex;
            flex-direction: column;
            gap: 18px;
            background: var(--surface-color);
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 400px; /* Limit form width */
        }
        #send-form { /* Override for message input form */
            flex-direction: row;
            align-items: flex-end; /* Align button with bottom of textarea */
            padding: 15px;
            margin: 0 20px 20px 20px; /* Add margin around the send form */
            max-width: none; /* Allow full width */
            gap: 10px;
            box-shadow: none;
            background: var(--surface-color);
            border-radius: 12px;
        }

        input, button, textarea {
            padding: 12px 15px;
            font-size: 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-family: var(--font-family);
        }

        input, textarea {
            background: var(--bg-color);
            color: var(--text-color);
        }
        textarea:focus, input:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(0, 170, 255, 0.3);
        }

        textarea {
            resize: none;
            line-height: 1.5;
            overflow-y: auto; /* Show scrollbar when max-height is reached */
            min-height: calc(1.5em * 1 + 24px); /* Start at approx 1 line + padding */
            max-height: calc(1.5em * 12 + 24px); /* Max approx 12 lines + padding */
            height: auto; /* Initial auto height */
        }
        textarea:disabled {
            background-color: #2d2d2d; /* Slightly different bg when disabled */
            opacity: 0.7;
            cursor: not-allowed;
        }

        button {
            background-color: var(--accent-color);
            color: #ffffff;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease;
            user-select: none;
            font-weight: 500;
            border: none; /* Remove border for buttons */
            display: inline-flex; /* Align icon and text */
            align-items: center;
            justify-content: center;
            gap: 8px; /* Space between icon and text */
        }

        button:hover:not(:disabled) {
            background-color: var(--accent-hover);
            transform: translateY(-1px);
        }

        button:active:not(:disabled) {
            transform: translateY(0);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        button#logout,
        .convo-item button {
            background-color: var(--danger-color);
        }
        button#logout:hover:not(:disabled),
        .convo-item button:hover:not(:disabled) {
            background-color: var(--danger-hover);
        }

        button#create-convo {
            flex-grow: 1; /* Allow New Convo button to take more space if needed */
        }

        button#clear-all {
             background-color: var(--surface-hover);
             color: var(--text-muted);
             border: 1px solid var(--border-color);
        }
        button#clear-all:hover:not(:disabled) {
            background-color: var(--danger-color);
            color: white;
            border-color: var(--danger-color);
        }

        .copy-btn {
            background: var(--surface-hover);
            color: var(--text-muted);
            padding: 4px 8px;
            font-size: 12px;
            border: none;
            border-radius: 5px;
            opacity: 0.7;
            transition: opacity 0.2s ease, background-color 0.2s ease;
        }
        .message-header:hover .copy-btn {
            opacity: 1;
        }
        .copy-btn:hover {
            background: var(--accent-color);
            color: white;
        }
        .copy-btn.copied {
            background: var(--success-color);
            color: white;
        }

        a {
            color: var(--accent-color);
            text-decoration: none;
            font-weight: 500;
        }
        a:hover {
            text-decoration: underline;
        }

        /* Conversations Sidebar */
        .convo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: transparent; /* Use transparent bg */
            border-radius: 6px;
            margin-bottom: 5px;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
        }
        .convo-item:hover {
            background: var(--surface-hover);
        }
        .convo-item.selected {
            background: var(--accent-color);
            color: white;
        }
        .convo-item.selected:hover {
             background: var(--accent-hover);
        }

        .convo-item span {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: 10px; /* Space before delete button */
            font-size: 15px;
        }

        .convo-item button { /* Delete button */
            background: transparent;
            color: var(--text-muted);
            padding: 3px 6px;
            font-size: 14px;
            flex-shrink: 0;
            opacity: 0.6;
            transition: opacity 0.2s ease, color 0.2s ease;
        }
         .convo-item:hover button {
            opacity: 1;
        }
        .convo-item button:hover {
            color: var(--danger-color);
            background: transparent; /* Keep transparent */
            transform: none; /* No move on hover */
        }
        .convo-item.selected button {
            color: rgba(255, 255, 255, 0.7);
        }
        .convo-item.selected button:hover {
            color: var(--danger-color);
            background-color: rgba(0, 0, 0, 0.2);
        }


        /* Messages Area */
        .messages-container {
            flex: 1; /* Takes available space */
            overflow-y: auto;
            padding: 20px 20px 5px 20px; /* More padding, less at bottom */
            display: flex;
            flex-direction: column;
        }
        /* Custom scrollbar for messages */
        .messages-container::-webkit-scrollbar { width: 8px; }
        .messages-container::-webkit-scrollbar-track { background: var(--bg-color); }
        .messages-container::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .messages-container::-webkit-scrollbar-thumb:hover { background: #555; }


        #messages {
            display: flex;
            flex-direction: column;
            gap: 25px; /* Increased gap */
            width: 100%;
            max-width: 800px; /* Limit message width for readability */
            margin: 0 auto; /* Center messages */
            padding-bottom: 15px; /* Space at the very bottom */
        }

        .message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .message[data-role="user"] {
            /* Optional: Style user messages differently if needed */
        }
         .message[data-role="assistant"] {
            /* Optional: Style assistant messages differently if needed */
        }

        .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--surface-hover);
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
            margin-top: 2px; /* Align better with text */
        }

        .message-bubble {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px; /* Space between header and content */
        }
        .message-header .role {
            font-weight: 700;
            font-size: 15px;
        }

        .message-content {
            background: var(--surface-color);
            padding: 12px 15px;
            border-radius: 10px;
            border-top-left-radius: 0; /* Give it a bubble shape */
            line-height: 1.6;
        }
        .message[data-role="user"] .message-content {
            background: var(--accent-color); /* Different bg for user */
            color: white;
            border-top-left-radius: 10px;
            border-top-right-radius: 0; /* Flip bubble shape */
        }
        /* Adjust code block styling within messages */
        .message-content pre {
            background-color: var(--bg-color); /* Darker bg for code */
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 10px 0;
            border: 1px solid var(--border-color);
        }
        .message-content pre code {
            background: none;
            padding: 0;
            color: inherit; /* Inherit color from highlightjs */
            font-size: 0.9em;
        }
        .message-content p:first-child { margin-top: 0; }
        .message-content p:last-child { margin-bottom: 0; }
        .message-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background-color: var(--bg-color);
        }
        .message-content th, .message-content td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
        }
        .message-content th {
            background-color: var(--surface-hover);
        }

        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 10px 15px;
            background: var(--surface-color);
            border-radius: 10px;
            border-top-left-radius: 0; /* Match bubble shape */
            align-self: flex-start; /* Align to left */
        }
        .typing-indicator span {
            width: 8px;
            height: 8px;
            background-color: var(--text-muted);
            border-radius: 50%;
            animation: bounce 1.2s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.3s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }

        /* Animations */
        @keyframes slideIn {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 767px) {
            body {
                /* No major changes needed as main already flexes */
            }
            header {
                height: 60px; /* Slightly smaller header */
                padding: 0 15px;
            }
            #menu-toggle {
                display: block; /* Show menu button */
            }
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 280px; /* Fixed width when open */
                height: 100%;
                transform: translateX(-100%);
                z-index: 1000;
                border-right: none; /* Remove border when overlaying */
                box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
            }
            .sidebar.open {
                transform: translateX(0);
            }
            #close-sidebar {
                display: inline-flex; /* Show close button */
            }
            .content {
                padding: 10px; /* Less padding */
            }
            .view {
                max-width: 100%;
            }
            #user-email {
                display: none; /* Hide email on small screens */
            }
            #messages {
                max-width: 100%; /* Full width on mobile */
            }
            #send-form {
                margin: 0 10px 10px 10px; /* Adjust margin */
                padding: 10px;
            }
            .sidebar-header-actions {
                /* Stack buttons on mobile if needed, though side-by-side might still fit */
                 /* flex-direction: column; */
                 /* align-items: stretch; */
            }
            .message-content {
                 font-size: 15px; /* Slightly smaller text on mobile */
            }
        }

        @media (min-width: 768px) {
            .sidebar {
                display: flex; /* Ensure it's visible */
            }
        }
    </style>
</head>
<body class="logged-out"> <!-- Start as logged-out -->
    <header>
        <button id="menu-toggle"><i class="fas fa-bars"></i></button>
        <h1><i class="fas fa-brain" style="margin-right: 8px; color: var(--accent-color);"></i>Genius System</h1>
        <div id="user-info">
            <span id="user-email"></span>
            <button id="logout" style="display: none;"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
    </header>
    <div class="backdrop"></div>
    <main>
        <div class="sidebar">
            <div class="sidebar-header">
                 <button id="close-sidebar"><i class="fas fa-times"></i></button>
                <h2>Conversations</h2>
                <div class="sidebar-header-actions">
                    <button id="create-convo"><i class="fas fa-plus"></i> New</button>
                    <button id="clear-all" title="Clear All Conversations"><i class="fas fa-trash-alt"></i> Clear All</button>
                </div>
            </div>
            <div class="sidebar-content">
                <div id="convo-list"></div>
            </div>
        </div>
        <div class="content">
            <!-- Login View -->
            <div class="view view-login active"> <!-- Start with login active -->
                 <div class="welcome-text">
                    <h2>Welcome to Genius System</h2>
                    <p>Your intelligent assistant for conversations, code generation, and more. Log in or register to begin.</p>
                </div>
                <form id="login-form">
                    <input type="email" id="login-email" placeholder="Email" required>
                    <input type="password" id="login-password" placeholder="Password" required>
                    <button type="submit"><i class="fas fa-sign-in-alt"></i> Login</button>
                </form>
                <p>Don't have an account? <a href="#" id="to-register">Register</a></p>
            </div>

            <!-- Register View -->
            <div class="view view-register">
                <h2>Register</h2>
                <form id="register-form">
                    <input type="email" id="register-email" placeholder="Email" required>
                    <input type="password" id="register-password" placeholder="Password" required>
                    <button type="submit"><i class="fas fa-user-plus"></i> Register</button>
                </form>
                <p>Already have an account? <a href="#" id="to-login">Login</a></p>
            </div>

            <!-- Verify Email View -->
            <div class="view view-verify">
                <h2>Verify Email</h2>
                 <p style="margin-bottom: 20px; color: var(--text-muted);">Enter the code sent to your email address.</p>
                <form id="verify-form">
                    <input type="email" id="verify-email" placeholder="Email" required readonly style="background-color: #2d2d2d;"> <!-- Readonly email -->
                    <input type="text" id="verify-code" placeholder="Verification Code" required>
                    <button type="submit"><i class="fas fa-check-circle"></i> Verify</button>
                </form>
                <button id="resend-code" style="background: none; border: none; color: var(--accent-color); margin-top: 15px;"><i class="fas fa-redo"></i> Resend Verification Code</button>
            </div>

            <!-- Dashboard View -->
            <div class="view view-dashboard">
                 <div style="text-align: center;">
                    <i class="fas fa-comments" style="font-size: 48px; color: var(--accent-color); margin-bottom: 20px;"></i>
                    <p style="font-size: 18px; color: var(--text-muted);">Select a conversation from the list or create a new one to start chatting.</p>
                </div>
            </div>

            <!-- Conversation View -->
            <div class="view view-conversation">
                <!-- Removed title and back button - info is in sidebar/header -->
                <div class="messages-container">
                    <div id="messages"></div>
                </div>
                <form id="send-form">
                    <textarea id="message-input" placeholder="Type your message... (Shift+Enter for new line)" rows="1"></textarea> <!-- Start with rows="1" -->
                    <button type="submit" id="send-button"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    </main>

    <script>
        const showdownConverter = new showdown.Converter({
            tables: true,
            tasklists: true,
            strikethrough: true,
            simplifiedAutoLink: true,
            openLinksInNewWindow: true // Open links in new tab
        });

        // Application State
        const state = {
            currentView: 'login', // Start at login
            jwt: null,
            user: null,
            conversations: [],
            selectedConvo: null,
            messages: [],
        };

        let typingIndicator = null;
        let activeRequestController = null; // To potentially cancel requests

        // DOM Elements
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.backdrop');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const messagesContainer = document.querySelector('.messages-container');
        const messagesDiv = document.getElementById('messages');
        const userEmailSpan = document.getElementById('user-email');
        const logoutButton = document.getElementById('logout');
        const convoListDiv = document.getElementById('convo-list');
        const convoTitleSpan = document.getElementById('convo-title'); // Keep if needed elsewhere, though removed from view

        // Utility Functions
        function setView(viewName, convoId = null) {
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            const targetView = document.querySelector(\`.view-\${viewName}\`);
            if(targetView) {
                targetView.classList.add('active');
            }
            state.currentView = viewName;

            // Close sidebar on navigation in mobile view
            if (window.innerWidth < 768) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('open');
            }

            if (viewName === 'conversation' && convoId) {
                window.location.hash = \`#convo-\${convoId}\`;
                messageInput.focus();
                 // Ensure conversation item is selected in sidebar
                highlightSelectedConvo(convoId);
            } else if (viewName === 'dashboard' || viewName === 'login' || viewName === 'register' || viewName === 'verify') {
                window.location.hash = \`#\${viewName}\`;
                 // Deselect conversation item
                highlightSelectedConvo(null);
            } else {
                 window.location.hash = '#'; // Fallback
            }

             // Update body class based on login status
            if (state.jwt) {
                body.classList.remove('logged-out');
                body.classList.add('logged-in');
            } else {
                body.classList.add('logged-out');
                body.classList.remove('logged-in');
            }
        }

        function updateUserInfo() {
            if (state.user) {
                userEmailSpan.textContent = state.user.email;
                logoutButton.style.display = 'inline-flex'; // Use inline-flex for button
            } else {
                userEmailSpan.textContent = '';
                logoutButton.style.display = 'none';
            }
        }

        function adjustTextareaHeight() {
            messageInput.style.height = 'auto'; // Reset height
            let scrollHeight = messageInput.scrollHeight;
            // Calculate max height based on style -- might need adjustment
            const style = window.getComputedStyle(messageInput);
            const maxHeight = parseInt(style.maxHeight, 10);

            if (scrollHeight > maxHeight) {
                 messageInput.style.height = \`\${maxHeight}px\`;
                 messageInput.style.overflowY = 'auto'; // Ensure scrollbar is visible if needed
            } else {
                 messageInput.style.height = \`\${scrollHeight}px\`;
                 messageInput.style.overflowY = 'hidden'; // Hide scrollbar if not needed
            }
        }

        function setSendingState(isSending) {
            messageInput.disabled = isSending;
            sendButton.disabled = isSending;
            if(isSending) {
                 // Optionally add a class for more specific styling
                 messageInput.style.opacity = '0.7';
                 sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Loading indicator
            } else {
                 messageInput.style.opacity = '1';
                 sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; // Reset icon
                 adjustTextareaHeight(); // Readjust height after sending
                 messageInput.focus();
            }
        }

        function showTypingIndicator() {
            if (typingIndicator) return; // Already showing
            typingIndicator = document.createElement('div');
            // Typing indicator now part of the message structure for consistency
            typingIndicator.className = 'message';
            typingIndicator.dataset.role = 'assistant'; // Treat like an assistant message visually
            typingIndicator.innerHTML = \`
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            \`;
            messagesDiv.appendChild(typingIndicator);
            scrollToBottom();
        }

        function removeTypingIndicator() {
            if (typingIndicator) {
                typingIndicator.remove();
                typingIndicator = null;
            }
        }

        function scrollToBottom(force = false) {
            const isScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 30; // Threshold
             // Only auto-scroll if the user is already near the bottom or forcing
            if (force || isScrolledToBottom) {
                 messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        // Event Handlers
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const button = e.target.querySelector('button');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    state.jwt = data.token; // Use jwt now
                    state.user = { email };
                    localStorage.setItem('jwt', data.token); // Store as jwt
                    updateUserInfo();
                    await loadConversations(); // Load convos *before* setting view
                    setView('dashboard'); // Go to dashboard after login
                } else {
                    alert(\`Login failed: \${data.message}\`);
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('An error occurred during login.');
            } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const button = e.target.querySelector('button');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Registration successful. Please check your email for the verification code.');
                    document.getElementById('verify-email').value = email; // Pre-fill email
                    setView('verify');
                } else {
                    alert(\`Registration failed: \${data.message}\`);
                }
            } catch (err) {
                console.error('Register error:', err);
                alert('An error occurred during registration.');
            } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-user-plus"></i> Register';
            }
        });

        document.getElementById('verify-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('verify-email').value;
            const code = document.getElementById('verify-code').value;
            const button = e.target.querySelector('button');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

            try {
                const response = await fetch('/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code }),
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Email verified successfully! You can now log in.');
                    document.getElementById('login-email').value = email; // Pre-fill login email
                    setView('login');
                } else {
                    alert(\`Verification failed: \${data.message}\`);
                }
            } catch (err) {
                console.error('Verify error:', err);
                alert('An error occurred during verification.');
            } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-check-circle"></i> Verify';
            }
        });

        document.getElementById('resend-code').addEventListener('click', async (e) => {
            const email = document.getElementById('verify-email').value;
             if (!email) {
                 alert("Please ensure the email field is filled.");
                 return;
             }
             const button = e.target;
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';

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
                    alert(\`Failed to resend code: \${data.message}\`);
                }
            } catch (err) {
                console.error('Resend code error:', err);
                alert('An error occurred while resending the code.');
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-redo"></i> Resend Verification Code';
            }
        });

        document.getElementById('create-convo').addEventListener('click', async (e) => {
            const title = prompt('Enter conversation title:', 'New Conversation');
             if (!title || !title.trim()) return; // Handle empty or cancelled prompt

            const button = e.target;
            button.disabled = true; // Disable button during request

            try {
                const response = await fetch('/convo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${state.jwt}\`, // Use jwt
                    },
                    body: JSON.stringify({ title: title.trim() }),
                });
                const newConvo = await response.json(); // Assume API returns the new convo object {id, title, ...}
                if (response.ok && newConvo && newConvo.id) {
                    // Add to state *first*
                    state.conversations.unshift(newConvo); // Add to beginning
                    state.selectedConvo = newConvo.id;
                    state.messages = []; // Clear messages for new convo

                    // Update UI
                    renderConversations(); // Re-render list
                    // convoTitleSpan.textContent = newConvo.title; // Update title if displayed
                    renderMessages(); // Render empty messages
                    setView('conversation', newConvo.id); // Switch view and update hash
                     // highlightSelectedConvo is called within setView
                } else {
                    alert(newConvo.message || 'Failed to create conversation.');
                }
            } catch (err) {
                console.error('Create convo error:', err);
                alert('An error occurred while creating the conversation.');
            } finally {
                 button.disabled = false; // Re-enable button
            }
        });

        document.getElementById('clear-all').addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
                const button = e.target;
                button.disabled = true;
                try {
                    const response = await fetch('/convo/all', {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${state.jwt}\` }, // Use jwt
                    });
                    if (response.ok) {
                        state.conversations = [];
                        state.selectedConvo = null;
                        state.messages = [];
                        renderConversations();
                        renderMessages();
                        setView('dashboard');
                    } else {
                        const data = await response.json();
                        alert(\`Failed to clear conversations: \${data.message}\`);
                    }
                } catch (err) {
                    console.error('Clear all convos error:', err);
                    alert('An error occurred while clearing conversations.');
                } finally {
                    button.disabled = false;
                }
            }
        });

        // Removed Back to Dashboard button handler

        messageInput.addEventListener('input', adjustTextareaHeight);
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline
                document.getElementById('send-form').requestSubmit(); // Trigger form submission
            }
        });

        document.getElementById('send-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageContent = messageInput.value.trim();
            if (!messageContent || !state.selectedConvo) return;

            setSendingState(true);

            // Add user message immediately
            state.messages.push({ role: 'user', content: messageContent });
            renderMessages();
            scrollToBottom(true); // Force scroll after adding user message
            messageInput.value = ''; // Clear input immediately
            adjustTextareaHeight(); // Reset height after clearing

            showTypingIndicator();

            // Abort previous request if any
            if (activeRequestController) {
                activeRequestController.abort();
            }
            activeRequestController = new AbortController();
            const signal = activeRequestController.signal;

            try {
                const response = await fetch(\`/send/\${state.selectedConvo}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${state.jwt}\`, // Use jwt
                    },
                    body: JSON.stringify({ message: messageContent, stream: true }),
                    signal: signal, // Pass the signal
                });

                removeTypingIndicator(); // Remove indicator once response starts

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || \`HTTP error! Status: \${response.status}\`);
                }

                if (!response.body) {
                     throw new Error("Response body is missing.");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let assistantMessageContent = '';
                const assistantMsg = { role: 'assistant', content: '' };
                state.messages.push(assistantMsg);
                renderMessages(); // Render the empty assistant message bubble

                // Find the last message element (the one we just added) to update
                 const lastMessageContentElement = messagesDiv.querySelector('.message:last-child .message-content');

                async function readStream() {
                    try {
                         while (true) {
                             const { done, value } = await reader.read();
                             if (done) {
                                 activeRequestController = null; // Clear controller
                                 // Final update with complete content for state and clipboard
                                 assistantMsg.content = assistantMessageContent;
                                 hljs.highlightAll(); // Ensure highlighting is applied after stream ends
                                 setSendingState(false);
                                 return;
                             }

                             const chunk = decoder.decode(value, { stream: true });
                             const events = chunk.split('\\n\\n');

                             for (const event of events) {
                                 if (event.startsWith('data: ')) {
                                     const dataString = event.substring(6);
                                     if (dataString.trim()) { // Avoid processing empty data lines
                                         try {
                                             const parsed = JSON.parse(dataString);
                                             if (parsed.message) {
                                                 assistantMessageContent += parsed.message;
                                                  // Update the DOM directly for performance
                                                 if(lastMessageContentElement) {
                                                     // Convert markdown chunk to HTML and append
                                                     const htmlChunk = showdownConverter.makeHtml(parsed.message);
                                                     // Create a temporary div to parse the htmlChunk
                                                     const tempDiv = document.createElement('div');
                                                     tempDiv.innerHTML = htmlChunk;
                                                     // Append nodes, handling potential multiple elements from markdown (e.g., paragraphs)
                                                     while(tempDiv.firstChild) {
                                                         lastMessageContentElement.appendChild(tempDiv.firstChild);
                                                     }

                                                     // Basic code block detection and highlighting trigger (might need refinement)
                                                     if (lastMessageContentElement.querySelector('pre code:not(.hljs)')) {
                                                          hljs.highlightElement(lastMessageContentElement.querySelector('pre code:not(.hljs)'));
                                                     }
                                                 }
                                                 scrollToBottom(); // Scroll as content arrives
                                             }
                                         } catch (parseErr) {
                                             console.error('Error parsing SSE data:', dataString, parseErr);
                                              // Append raw data if parsing fails? Maybe show an error?
                                              // For now, just log it.
                                         }
                                     }
                                 }
                             }
                         }
                    } catch (streamErr) {
                        // Handle errors that occur during streaming (including abort)
                        if (streamErr.name === 'AbortError') {
                            console.log('Fetch aborted');
                             // Add a message indicating abortion if desired
                             // assistantMsg.content += "\\n\\n*Request cancelled.*";
                        } else {
                            console.error('Error reading stream:', streamErr);
                            assistantMsg.content = assistantMessageContent + "\\n\\n*Error receiving response.*"; // Update state with error
                            if(lastMessageContentElement) {
                                 lastMessageContentElement.innerHTML = showdownConverter.makeHtml(assistantMsg.content); // Update UI with error
                            }
                        }
                        removeTypingIndicator();
                        setSendingState(false);
                        activeRequestController = null;
                    }
                }
                readStream();

            } catch (err) {
                 if (err.name === 'AbortError') {
                     console.log('Initial fetch request aborted');
                 } else {
                    console.error('Send message error:', err);
                    alert(\`Error sending message: \${err.message}\`);
                 }
                removeTypingIndicator();
                setSendingState(false);
                activeRequestController = null;
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
            localStorage.removeItem('jwt'); // Remove jwt
            state.jwt = null;
            state.user = null;
            state.conversations = [];
            state.selectedConvo = null;
            state.messages = [];
            renderConversations(); // Clear sidebar
            renderMessages(); // Clear messages view
            updateUserInfo();
            setView('login'); // Go back to login screen
        });

        // Mobile Sidebar Toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            sidebar.classList.add('open');
            backdrop.classList.add('open');
        });

        document.getElementById('close-sidebar').addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
        });

        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
        });

        // Conversation Management
        async function loadConversations() {
            if (!state.jwt) return; // Don't load if not logged in
            try {
                const response = await fetch('/convos', {
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` }, // Use jwt
                });
                 if (response.status === 401) { // Handle expired/invalid token
                     console.warn("Unauthorized fetching convos. Logging out.");
                     triggerLogout();
                     return;
                 }
                const data = await response.json();
                if (response.ok) {
                    state.conversations = data || []; // Ensure it's an array
                    renderConversations();
                } else {
                    console.error('Failed to load convos:', data.message);
                    // Don't alert, just log maybe? Or show a non-modal error.
                }
            } catch (err) {
                console.error('Load conversations error:', err);
                // alert('An error occurred while loading conversations');
            }
        }

        function renderConversations() {
            convoListDiv.innerHTML = ''; // Clear previous list
             if (!state.conversations || state.conversations.length === 0) {
                 convoListDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 14px;">No conversations yet.</p>';
                 return;
             }

            state.conversations.forEach(convo => {
                const div = document.createElement('div');
                div.className = 'convo-item';
                div.dataset.id = convo.id;

                const titleSpan = document.createElement('span');
                titleSpan.textContent = convo.title || 'Untitled'; // Fallback title
                titleSpan.title = convo.title || 'Untitled'; // Tooltip for long titles

                // Click on the whole item (except delete button) to select
                div.addEventListener('click', (e) => {
                    // Prevent selection if delete button was clicked
                     if (e.target.closest('.delete-convo-btn')) return;

                    if (state.selectedConvo !== convo.id) { // Only load if not already selected
                        state.selectedConvo = convo.id;
                        // convoTitleSpan.textContent = convo.title; // Update title if displayed
                        loadMessages(convo.id); // Load messages for the clicked convo
                        setView('conversation', convo.id); // Switch view and hash
                    } else {
                        // If already selected, maybe just ensure view is correct (useful for hash changes)
                        setView('conversation', convo.id);
                    }
                     // Highlight selection is handled by highlightSelectedConvo called within setView/handleHashChange
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-convo-btn'; // Add class for event delegation
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.title = 'Delete Conversation';
                deleteButton.addEventListener('click', async (e) => {
                     e.stopPropagation(); // Prevent convo item click event
                    if (confirm(\`Are you sure you want to delete "\${convo.title || 'Untitled'}"?\`)) {
                        deleteButton.disabled = true; // Disable button during delete
                        try {
                            const response = await fetch(\`/convo/\${convo.id}\`, {
                                method: 'DELETE',
                                headers: { 'Authorization': \`Bearer \${state.jwt}\` }, // Use jwt
                            });
                            if (response.ok) {
                                // Remove from state and UI without full reload
                                state.conversations = state.conversations.filter(c => c.id !== convo.id);
                                div.remove(); // Remove element directly
                                if (state.selectedConvo === convo.id) {
                                    state.selectedConvo = null;
                                    state.messages = [];
                                    renderMessages();
                                    setView('dashboard');
                                }
                                // If no convos left, show message
                                if (state.conversations.length === 0) {
                                     renderConversations();
                                }
                            } else {
                                const data = await response.json();
                                alert(\`Failed to delete conversation: \${data.message}\`);
                                deleteButton.disabled = false; // Re-enable on failure
                            }
                        } catch (err) {
                            console.error('Delete convo error:', err);
                            alert('An error occurred while deleting conversation.');
                            deleteButton.disabled = false; // Re-enable on error
                        }
                    }
                });
                div.appendChild(titleSpan);
                div.appendChild(deleteButton);
                convoListDiv.appendChild(div);
            });
             // Highlight after rendering
             highlightSelectedConvo(state.selectedConvo);
        }

         function highlightSelectedConvo(convoId) {
            document.querySelectorAll('.convo-item').forEach(item => {
                item.classList.remove('selected');
                if (item.dataset.id === String(convoId)) { // Compare as strings
                    item.classList.add('selected');
                }
            });
        }

        async function loadMessages(convoId) {
             if (!state.jwt) return;
            messagesDiv.innerHTML = '<div style="text-align: center; margin-top: 50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color: var(--text-muted);"></i><p style="color: var(--text-muted);">Loading messages...</p></div>'; // Loading indicator
            try {
                const response = await fetch(\`/convo/\${convoId}\`, {
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` }, // Use jwt
                });
                 if (response.status === 401) {
                     console.warn("Unauthorized fetching messages. Logging out.");
                     triggerLogout();
                     return;
                 }
                const data = await response.json();
                if (response.ok) {
                    state.messages = data || []; // Ensure it's an array
                    renderMessages();
                    scrollToBottom(true); // Force scroll to bottom after loading
                } else {
                    alert(\`Failed to load messages: \${data.message}\`);
                     messagesDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load messages.</p>';
                }
            } catch (err) {
                console.error('Load messages error:', err);
                alert('An error occurred while loading messages.');
                 messagesDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color);">An error occurred while loading messages.</p>';
            }
        }

        function renderMessages() {
            // Keep track of current scroll position if needed for smarter scrolling
             // const currentScrollTop = messagesContainer.scrollTop;
             // const currentScrollHeight = messagesContainer.scrollHeight;
             // const isAtBottom = currentScrollHeight - currentScrollTop <= messagesContainer.clientHeight + 10;

            messagesDiv.innerHTML = ''; // Clear previous messages
            if (!state.messages || state.messages.length === 0 && state.currentView === 'conversation') {
                 messagesDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 30px;">Send a message to start the conversation.</p>';
                 return;
            }

            state.messages.forEach(msg => {
                if (!msg || !msg.role || typeof msg.content === 'undefined') {
                     console.warn("Skipping invalid message object:", msg);
                     return; // Skip malformed messages
                }
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.dataset.role = msg.role; // Add role as data attribute

                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                avatarDiv.innerHTML = msg.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

                const bubbleDiv = document.createElement('div');
                bubbleDiv.className = 'message-bubble';

                const headerDiv = document.createElement('div');
                headerDiv.className = 'message-header';

                const roleSpan = document.createElement('span');
                roleSpan.className = 'role';
                roleSpan.textContent = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
                headerDiv.appendChild(roleSpan);

                // Only add copy button to non-empty assistant messages
                if (msg.role === 'assistant' && msg.content.trim()) {
                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-btn';
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>'; // Icon only
                    copyButton.title = 'Copy message';
                    copyButton.addEventListener('click', () => {
                        navigator.clipboard.writeText(msg.content).then(() => {
                             copyButton.innerHTML = '<i class="fas fa-check"></i>'; // Check icon
                             copyButton.title = 'Copied!';
                             copyButton.classList.add('copied');
                             setTimeout(() => {
                                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                                copyButton.title = 'Copy message';
                                copyButton.classList.remove('copied');
                             }, 1500); // Revert after 1.5 seconds
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            alert('Failed to copy message');
                        });
                    });
                    headerDiv.appendChild(copyButton);
                }

                bubbleDiv.appendChild(headerDiv);

                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';

                if (msg.role === 'assistant') {
                    // Render Markdown only for assistant
                     const rawHtml = showdownConverter.makeHtml(msg.content || ''); // Ensure content exists
                    contentDiv.innerHTML = rawHtml;
                     // Apply highlighting to all code blocks within this message content
                     contentDiv.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                } else {
                    // Display user message as plain text (escaped by browser)
                    contentDiv.textContent = msg.content || '';
                }
                bubbleDiv.appendChild(contentDiv);

                messageDiv.appendChild(avatarDiv);
                messageDiv.appendChild(bubbleDiv);
                messagesDiv.appendChild(messageDiv);
            });

            // Restore scroll position intelligently or scroll to bottom
             // if (isAtBottom) {
             //     scrollToBottom(true); // Force scroll if was at bottom
             // } else {
                 // messagesContainer.scrollTop = currentScrollTop; // Try to maintain position if user scrolled up
             // }
              // Simplified: Always scroll to bottom for now, can be refined later.
             // scrollToBottom(true); // Moved this call elsewhere (after load, after send)
        }

        function triggerLogout() {
             localStorage.removeItem('jwt');
             state.jwt = null;
             state.user = null;
             // Clear sensitive state, maybe not conversations if we want to keep them visually until reload?
             state.selectedConvo = null;
             state.messages = [];
             updateUserInfo();
             setView('login');
             alert("Your session has expired or is invalid. Please log in again.");
        }

        // Hash Change Handler
        async function handleHashChange() {
             if (!state.jwt) {
                // If not logged in, only allow login/register/verify routes
                 const allowedRoutes = ['#login', '#register', '#verify'];
                 if (!allowedRoutes.includes(window.location.hash) && window.location.hash !== '') {
                     setView('login'); // Redirect to login
                 } else if (window.location.hash === '#register') {
                     setView('register');
                 } else if (window.location.hash === '#verify') {
                     // Allow going to verify, assuming email might be pre-filled
                     setView('verify');
                 } else {
                     setView('login'); // Default to login
                 }
                 return;
             }

            // If logged in:
            const hash = window.location.hash;
            if (hash.startsWith('#convo-')) {
                const convoId = hash.substring(7); // Get ID after #convo-
                 // Find convo in state (compare as string might be safer if IDs are numbers)
                 const convoExists = state.conversations.find(c => String(c.id) === convoId);

                 if (convoExists) {
                     if (state.selectedConvo !== convoId) { // Only load if different
                        state.selectedConvo = convoId;
                        // convoTitleSpan.textContent = convoExists.title; // Update title if needed
                        await loadMessages(convoId);
                        setView('conversation', convoId); // Set view *after* loading messages
                     } else {
                        // If already selected, just ensure view is correct
                        setView('conversation', convoId);
                     }
                     highlightSelectedConvo(convoId); // Ensure highlighted
                 } else {
                     // Convo ID in hash doesn't exist (maybe deleted?), go to dashboard
                     console.warn(\`Conversation ID \${convoId} not found, redirecting to dashboard.\`);
                     state.selectedConvo = null;
                     setView('dashboard');
                 }
            } else if (hash === '#dashboard') {
                state.selectedConvo = null; // Deselect convo
                setView('dashboard');
            } else if (hash === '#login' || hash === '#register' || hash === '#verify') {
                 // Logged in user trying to access login/register? Redirect to dashboard.
                 setView('dashboard');
            } else {
                // Default view for logged-in user (e.g., empty hash)
                setView('dashboard');
            }
        }

        // Initialization
        window.addEventListener('load', async () => {
            const savedJwt = localStorage.getItem('jwt'); // Check for jwt
            if (savedJwt) {
                state.jwt = savedJwt;
                // Try to get user info (optional, could fetch /me endpoint)
                // For now, just assume token means logged in, derive email later if needed
                 // state.user = { email: 'Loading...' }; // Placeholder
                 // updateUserInfo(); // Update immediately with placeholder

                 // Load conversations first
                 await loadConversations();

                 // Only then, handle the hash to potentially load messages
                 await handleHashChange();

                 // If still no user info, fetch it (example /me endpoint)
                 /*
                 try {
                    const meResponse = await fetch('/me', { headers: { 'Authorization': \`Bearer \${state.jwt}\` } });
                    if (meResponse.ok) {
                        const userData = await meResponse.json();
                        state.user = userData; // Assuming { email: '...' }
                        updateUserInfo();
                    } else if (meResponse.status === 401) {
                         triggerLogout(); // Invalid token on load
                    }
                 } catch (err) { console.error("Failed to fetch user info", err); }
                 */
                 // Simplified: Assume JWT is valid for now, get email from login/future /me
                 if (state.user) updateUserInfo(); // Update if user was set somehow (e.g. during login process if page wasn't reloaded)


            } else {
                setView('login'); // Start at login if no token
            }
            updateUserInfo(); // Final UI update based on initial state
             adjustTextareaHeight(); // Initial adjustment for textarea
        });

        window.addEventListener('hashchange', handleHashChange);

        // Add listener to adjust textarea on window resize potentially
         // window.addEventListener('resize', adjustTextareaHeight);

    </script>
</body>
</html>
`;
