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
            --scrollbar-color: #555;
            --scrollbar-track-color: var(--surface-color);
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
            display: flex;
            flex-direction: column;
            height: 100vh; /* Full viewport height */
            overflow: hidden; /* Prevent body scroll */
        }
        body.loading main {
            visibility: hidden; /* Hide main content while loading */
        }
        body.logged-out .sidebar,
        body.logged-out #menu-toggle,
        body.logged-out .sidebar-footer {
            display: none;
        }
        body.logged-in #loading-overlay {
             display: none; /* Hide loader when logged in */
        }

        /* Loading Overlay */
        #loading-overlay {
            position: fixed;
            inset: 0;
            background-color: var(--bg-color);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000; /* Ensure it's on top */
            transition: opacity 0.3s ease;
        }
        #loading-overlay i {
            font-size: 40px;
            color: var(--accent-color);
        }
        body:not(.loading) #loading-overlay {
             opacity: 0;
             pointer-events: none;
        }


        header {
            background-color: var(--surface-color);
            padding: 0 20px;
            height: var(--header-height);
            display: flex;
            flex-wrap: nowrap;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            position: sticky; /* Keeps header fixed if body allowed scrolling, but body shouldn't scroll */
            top: 0;
            z-index: 100;
            flex-shrink: 0; /* Prevent header from shrinking */
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
            overflow: hidden; /* Critical: Prevent main from causing body scroll */
            /* visibility added/removed by body.loading class */
        }

        .sidebar {
            width: 260px;
            background: var(--surface-color);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            height: 100%; /* Fill height of main */
            transition: transform 0.3s ease, width 0.3s ease;
            flex-shrink: 0;
            position: relative; /* Needed for absolute positioning of footer */
            overflow: hidden; /* Container for scrolling content */
        }

        .sidebar-header {
            padding: 15px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex-shrink: 0; /* Prevent shrinking */
        }
        .sidebar-header h2 {
            margin: 0 0 5px 0;
            font-size: 18px;
        }
        .sidebar-header-actions {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .sidebar-content {
            flex: 1; /* Takes available vertical space */
            overflow-y: auto; /* Enable scrolling for convo list */
            padding: 15px;
            min-height: 0; /* Allow shrinking */
        }
        /* Custom scrollbar for sidebar */
        .sidebar-content::-webkit-scrollbar { width: 8px; }
        .sidebar-content::-webkit-scrollbar-track { background: var(--scrollbar-track-color); }
        .sidebar-content::-webkit-scrollbar-thumb { background: var(--scrollbar-color); border-radius: 4px; }
        .sidebar-content::-webkit-scrollbar-thumb:hover { background: #666; }

         .sidebar-footer {
            padding: 15px;
            border-top: 1px solid var(--border-color);
            flex-shrink: 0; /* Prevent shrinking */
        }
        .sidebar-footer button {
            width: 100%; /* Make button full width */
        }

        #close-sidebar {
            display: none;
            width: auto;
            margin-bottom: 10px;
            align-self: flex-end;
            padding: 5px 10px;
            font-size: 18px;
        }

        .content {
            flex: 1; /* Takes remaining horizontal space */
            display: flex;
            flex-direction: column; /* Stack messages container and input form */
            /* Removed align/justify center - specific views handle this */
            /* padding: 20px; */ /* Removed padding - apply to specific views or containers */
            overflow: hidden; /* Prevent content overflow */
            height: 100%; /* Fill height of main */
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
            display: none; /* Hide inactive views */
            width: 100%;
            height: 100%; /* Views should fill the content area */
            opacity: 0;
            transition: opacity 0.4s ease;
            animation: fadeIn 0.4s ease forwards;
            padding: 20px; /* Default padding for simple views */
            overflow: auto; /* Allow scrolling for simple views if needed */
            max-width: 600px; /* Limit width for form views */
            margin: 0 auto; /* Center form views */
        }

        .view.active {
            display: flex; /* Use flex for layout */
            flex-direction: column;
            align-items: center; /* Center content in simple views */
            opacity: 1;
        }

        /* Overrides for specific views */
         .view-dashboard, .view-login, .view-register, .view-verify {
             justify-content: center; /* Vertically center simple views */
         }

        .view-conversation {
            max-width: none; /* Allow conversation to fill width */
            padding: 0; /* Remove default padding */
            overflow: hidden; /* Prevent conversation view itself from scrolling */
            /* height: 100%; */ /* Ensure it takes full height (already done by .view) */
        }

        .view-conversation.active {
            display: flex; /* Use flex for conversation layout */
            flex-direction: column;
            align-items: stretch; /* Stretch children horizontally */
            justify-content: flex-end; /* Push content to bottom (messages container will grow) */
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
            max-width: 400px;
            flex-shrink: 0; /* Prevent form from shrinking in flex */
        }
        #send-form { /* Override for message input form */
            flex-direction: row;
            align-items: flex-end;
            padding: 15px;
            margin: 0 20px 20px 20px; /* Margin around the form */
            max-width: 900px; /* Limit width, centered */
            width: calc(100% - 40px); /* Responsive width */
            margin-left: auto;
            margin-right: auto;
            gap: 10px;
            box-shadow: none;
            background: var(--surface-color);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            flex-shrink: 0; /* Prevent shrinking */
            position: relative; /* Keep it in flow */
            z-index: 10; /* Above messages */
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
            overflow-y: auto;
            min-height: calc(1.5em * 1 + 24px);
            max-height: calc(1.5em * 12 + 24px);
            height: calc(1.5em * 1 + 24px);;
            width: 100%;
        }
        textarea:disabled {
            background-color: #2d2d2d;
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
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex-shrink: 0; /* Prevent button shrinking */
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
        button#sidebar-logout,
        .convo-item button {
            background-color: var(--danger-color);
        }
        button#logout:hover:not(:disabled),
        button#sidebar-logout:hover:not(:disabled),
        .convo-item button:hover:not(:disabled) {
            background-color: var(--danger-hover);
        }

        button#create-convo {
            flex-grow: 1;
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

        /* Copy Buttons (General and Code Block Specific) */
        .copy-btn {
            background: var(--surface-hover);
            color: var(--text-muted);
            padding: 4px 8px;
            font-size: 12px;
            border: none;
            border-radius: 5px;
            opacity: 0.7;
            transition: opacity 0.2s ease, background-color 0.2s ease;
            cursor: pointer;
        }
        .message-header:hover .copy-btn,
        .code-block-wrapper:hover .copy-btn { /* Show on hover of wrapper */
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

        .code-block-wrapper {
            position: relative;
            margin: 10px 0;
        }
        .code-block-wrapper .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 1;
            opacity: 0; /* Initially hidden */
        }
        .code-block-wrapper pre {
             margin: 0; /* Remove margin from pre inside wrapper */
             position: relative; /* Needed for z-index stacking context if any */
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
            background: transparent;
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
            margin-right: 10px;
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
            background: transparent;
            transform: none;
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
            flex: 1; /* CRITICAL: Takes available space in .view-conversation */
            overflow-y: auto; /* CRITICAL: Enables scrolling ONLY for messages */
            padding: 20px 20px 5px 20px;
            display: flex; /* To allow #messages to be centered or aligned */
            flex-direction: column;
            min-height: 0; /* Allow shrinking */
        }
        /* Custom scrollbar for messages */
        .messages-container::-webkit-scrollbar { width: 8px; }
        .messages-container::-webkit-scrollbar-track { background: var(--bg-color); }
        .messages-container::-webkit-scrollbar-thumb { background: var(--scrollbar-color); border-radius: 4px; }
        .messages-container::-webkit-scrollbar-thumb:hover { background: #666; }


        #messages {
            display: flex;
            flex-direction: column;
            gap: 25px;
            width: 100%;
            max-width: 800px;
            margin: 0 auto; /* Center messages within scrollable container */
            padding-bottom: 15px;
            /* flex: 1; */ /* Removed - messages div grows naturally, container scrolls */
        }

        .message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            /* animation: slideIn 0.3s ease forwards; */ /* Re-enable if desired, might impact scroll perf */
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
            margin-top: 2px;
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
            margin-bottom: 6px;
        }
        .message-header .role {
            font-weight: 700;
            font-size: 15px;
        }

        .message-content {
            background: var(--surface-color);
            padding: 12px 15px;
            border-radius: 10px;
            border-top-left-radius: 0;
            line-height: 1.6;
            overflow-wrap: break-word; /* Wrap long words/strings */
            word-break: break-word; /* Ensure breaks happen */
        }
        .message[data-role="user"] .message-content {
            background: var(--accent-color);
            color: white;
            border-top-left-radius: 10px;
            border-top-right-radius: 0;
        }
        /* Code block styling within messages */
        .message-content pre {
            background-color: var(--bg-color);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto; /* Horizontal scroll for code */
            /* margin: 10px 0; */ /* Removed margin, handled by wrapper */
            border: 1px solid var(--border-color);
            /* Custom scrollbar for code blocks */
            scrollbar-width: thin;
            scrollbar-color: var(--scrollbar-color) var(--bg-color);
        }
        .message-content pre::-webkit-scrollbar { height: 6px; }
        .message-content pre::-webkit-scrollbar-track { background: var(--bg-color); }
        .message-content pre::-webkit-scrollbar-thumb { background-color: var(--scrollbar-color); border-radius: 3px; }

        .message-content pre code {
            background: none;
            padding: 0;
            color: inherit;
            font-size: 0.9em;
            white-space: pre; /* Preserve whitespace and prevent wrapping */
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
            border-top-left-radius: 0;
            align-self: flex-start;
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
                height: 100vh; /* Ensure full height on mobile */
            }
            header {
                height: 60px;
                padding: 0 15px;
            }
            #menu-toggle {
                display: block;
            }
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: 280px;
                height: 100%; /* Full height overlay */
                transform: translateX(-100%);
                z-index: 1000;
                border-right: none;
                box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
                /* Height calculation removed, now it's full height */
            }
            .sidebar.open {
                transform: translateX(0);
            }
            #close-sidebar {
                display: inline-flex;
            }
            .content {
                 /* Removed padding */
                 height: calc(100vh - var(--header-height)); /* Ensure content fills below header */
            }
            .view {
                 padding: 15px; /* Slightly less padding in simple views */
                 max-width: 100%; /* Allow forms to take more width */
            }
            #user-email {
                display: none;
            }
            #messages {
                max-width: 100%;
            }
            #send-form {
                margin: 0 10px 10px 10px; /* Adjust margin */
                width: calc(100% - 20px);
                padding: 10px;
            }
            .message-content {
                 font-size: 15px;
            }
             /* Adjust message container padding on mobile */
            .messages-container {
                padding: 15px 10px 5px 10px;
            }
        }

        @media (min-width: 768px) {
            .sidebar {
                display: flex; /* Ensure it's visible */
                height: calc(100vh - var(--header-height)); /* Sidebar fills height below header */
                position: static; /* Not fixed on desktop */
                transform: none; /* Ensure no transform */
                box-shadow: none; /* No shadow */
                border-right: 1px solid var(--border-color);
            }
             /* Ensure content fills space next to sidebar */
             .content {
                 height: calc(100vh - var(--header-height));
             }
        }
    </style>
</head>
<body class="loading logged-out"> <!-- Start loading and logged-out -->
    <div id="loading-overlay">
        <i class="fas fa-spinner fa-spin"></i> <!-- Loading Spinner -->
    </div>
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
            <div class="sidebar-footer">
                 <button id="sidebar-logout"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>
        <div class="content">
            <!-- Login View -->
            <div class="view view-login"> <!-- Removed active class - handled by JS -->
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
                    <input type="email" id="verify-email" placeholder="Email" required readonly style="background-color: #2d2d2d;">
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
                <div class="messages-container">
                    <div id="messages"></div>
                </div>
                <form id="send-form">
                    <textarea id="message-input" placeholder="Type your message... (Shift+Enter for new line)" rows="1"></textarea>
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
            openLinksInNewWindow: true,
            backslashEscapesHTMLTags: true // Helps with rendering code containing HTML
        });
        // Tell Highlight.js to ignore unrecognized languages and not log warnings
        hljs.configure({ ignoreUnrecognizedLanguage: true });


        // Application State
        const state = {
            currentView: null, // Determined on load
            jwt: null,
            user: null,
            conversations: [],
            selectedConvo: null,
            messages: [],
        };

        let typingIndicator = null;
        let activeRequestController = null;

        // DOM Elements
        const body = document.body;
        const loadingOverlay = document.getElementById('loading-overlay');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.backdrop');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const messagesContainer = document.querySelector('.messages-container');
        const messagesDiv = document.getElementById('messages');
        const userEmailSpan = document.getElementById('user-email');
        const logoutButton = document.getElementById('logout');
        const sidebarLogoutButton = document.getElementById('sidebar-logout');
        const convoListDiv = document.getElementById('convo-list');

        // Utility Functions
        function setView(viewName, convoId = null) {
            if (state.currentView === viewName && viewName !== 'conversation') return; // Avoid unnecessary updates unless it's convo switching

             document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
             const targetView = document.querySelector(\`.view-\${viewName}\`);
             if(targetView) {
                 targetView.classList.add('active');
             } else {
                 // Fallback or error handling if view not found
                 console.error(\`View "\${viewName}" not found.\`);
                 document.querySelector('.view-dashboard')?.classList.add('active'); // Fallback to dashboard if possible
                 viewName = 'dashboard'; // Correct the state
             }
             state.currentView = viewName;

            // Close sidebar on navigation in mobile view
            if (window.innerWidth < 768) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('open');
            }

            // Update URL hash and focus
            let newHash = '#';
            if (viewName === 'conversation' && convoId) {
                newHash = \`#convo-\${convoId}\`;
                messageInput.focus();
                highlightSelectedConvo(convoId);
            } else if (['dashboard', 'login', 'register', 'verify'].includes(viewName)) {
                newHash = \`#\${viewName}\`;
                highlightSelectedConvo(null); // Deselect convo
            }

            // Update hash only if it's different to avoid loop with hashchange listener
             if (window.location.hash !== newHash) {
                window.location.hash = newHash;
            }

             // Update body class based on login status (redundant but safe)
            if (state.jwt) {
                body.classList.remove('logged-out');
                body.classList.add('logged-in');
            } else {
                body.classList.add('logged-out');
                body.classList.remove('logged-in');
            }

            // Remove loading state once a view is set
            body.classList.remove('loading');
            // loadingOverlay.style.display = 'none'; // Handled by body class CSS
        }

        function updateUserInfo() {
            if (state.user && state.user.email) {
                userEmailSpan.textContent = state.user.email;
                logoutButton.style.display = 'inline-flex';
                // Sidebar logout button visibility is controlled by body class
            } else {
                userEmailSpan.textContent = '';
                logoutButton.style.display = 'none';
            }
        }

        function adjustTextareaHeight() {
            // Temporarily reset height to auto to get the natural scrollHeight
            messageInput.style.height = 'auto';
            let scrollHeight = messageInput.scrollHeight;

            // Get computed style to read max-height property
            const computedStyle = window.getComputedStyle(messageInput);
            const maxHeight = parseInt(computedStyle.maxHeight, 10);

            // If scrollHeight exceeds maxHeight, set height to maxHeight and enable scroll
            if (maxHeight && scrollHeight > maxHeight) {
                messageInput.style.height = \`\${maxHeight}px\`;
                messageInput.style.overflowY = 'auto';
            } else {
                // Otherwise, set height to scrollHeight and hide scrollbar
                messageInput.style.height = \`\${scrollHeight}px\`;
                messageInput.style.overflowY = 'hidden';
            }
        }


        function setSendingState(isSending) {
            messageInput.disabled = isSending;
            sendButton.disabled = isSending;
            if(isSending) {
                 messageInput.style.opacity = '0.7';
                 sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            } else {
                 messageInput.style.opacity = '1';
                 sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
                 adjustTextareaHeight();
                 messageInput.focus();
            }
        }

        function showTypingIndicator() {
            if (typingIndicator) return;
            typingIndicator = document.createElement('div');
            typingIndicator.className = 'message';
            typingIndicator.dataset.role = 'assistant';
            typingIndicator.id = 'typing-indicator-message'; // ID for easy removal
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
            const indicator = document.getElementById('typing-indicator-message');
            if (indicator) {
                indicator.remove();
                typingIndicator = null; // Reset flag
            }
        }

        function scrollToBottom(force = false) {
            // Check if the user is scrolled near the bottom before auto-scrolling
            const isNearBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 100; // Increased threshold

            if (force || isNearBottom) {
                 // Use smooth scrolling for a nicer effect
                 messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
                 // Fallback for immediate scroll if needed
                 // messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        function addCopyButtonsToCodeBlocks(element) {
            element.querySelectorAll('pre').forEach((pre) => {
                // Check if the wrapper already exists
                if (pre.parentNode.classList.contains('code-block-wrapper')) {
                    return; // Already wrapped, possibly from streaming update
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.title = 'Copy code';
                copyButton.addEventListener('click', () => {
                    const code = pre.querySelector('code');
                    const textToCopy = code ? code.innerText : pre.innerText;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        copyButton.innerHTML = '<i class="fas fa-check"></i>';
                        copyButton.title = 'Copied!';
                        copyButton.classList.add('copied');
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                            copyButton.title = 'Copy code';
                            copyButton.classList.remove('copied');
                        }, 1500);
                    }).catch(err => {
                        console.error('Failed to copy code: ', err);
                        copyButton.title = 'Error copying';
                    });
                });

                wrapper.appendChild(copyButton);
                // Insert wrapper before pre, then move pre inside wrapper
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
            });
        }

         function triggerLogout() {
             localStorage.removeItem('jwt');
             state.jwt = null;
             state.user = null;
             state.conversations = [];
             state.selectedConvo = null;
             state.messages = [];
             renderConversations(); // Clear sidebar
             renderMessages(); // Clear messages view (though view will change)
             updateUserInfo();
             setView('login'); // Go back to login screen
             // alert("Your session has expired or is invalid. Please log in again."); // Optional alert
        }


        // --- Event Handlers ---

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
                    state.jwt = data.token;
                    // Attempt to decode email from JWT (simple decode, no verification)
                    try {
                         // Basic decode: only works if email is directly in payload, which it might not be
                         // const payload = JSON.parse(atob(data.token.split('.')[1]));
                         // state.user = { email: payload.email || email }; // Use provided email as fallback
                         // Safer: just store email from form for now. A /me endpoint is better.
                         state.user = { email: email };
                    } catch {
                        state.user = { email: email }; // Fallback if decode fails
                    }
                    localStorage.setItem('jwt', data.token);
                    updateUserInfo();
                    body.classList.remove('logged-out'); // Update body class immediately
                    body.classList.add('logged-in');
                    await loadConversations();
                    await handleHashChange(); // Navigate based on hash or default to dashboard
                } else {
                    alert(\`Login failed: \${data.message}\`);
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('An error occurred during login.');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
            // No finally needed here as button state handled in success/fail paths
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
                    document.getElementById('verify-email').value = email;
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
                    document.getElementById('login-email').value = email;
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
                button.disabled = false; // Use finally to ensure re-enabling
                button.innerHTML = '<i class="fas fa-redo"></i> Resend Verification Code';
                // Add a cooldown visual state if desired
                // setTimeout(() => { button.disabled = false; }, 45000); // Example
            }
        });

        document.getElementById('create-convo').addEventListener('click', async (e) => {
            const title = prompt('Enter conversation title:', \`Chat \${new Date().toLocaleTimeString()}\`);
             if (!title || !title.trim()) return;

            const button = e.target;
            button.disabled = true;

            try {
                const response = await fetch('/convo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${state.jwt}\`,
                    },
                    body: JSON.stringify({ title: title.trim() }),
                });
                const newConvo = await response.json();
                if (response.ok && newConvo && newConvo.id) {
                    // Assume API returns {id, title, user_id, created_at, updated_at}
                    state.conversations.unshift(newConvo); // Add to beginning
                    state.selectedConvo = newConvo.id;
                    state.messages = [];

                    renderConversations(); // Update sidebar
                    renderMessages(); // Clear messages area
                    setView('conversation', newConvo.id); // Switch view and update hash
                } else {
                    alert(newConvo.message || 'Failed to create conversation.');
                }
            } catch (err) {
                console.error('Create convo error:', err);
                alert('An error occurred while creating the conversation.');
            } finally {
                 button.disabled = false;
            }
        });

        document.getElementById('clear-all').addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
                const button = e.target;
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    const response = await fetch('/convo/all', {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${state.jwt}\` },
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
                    button.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
                }
            }
        });

        messageInput.addEventListener('input', adjustTextareaHeight);
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('send-form').requestSubmit();
            }
        });

        document.getElementById('send-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageContent = messageInput.value.trim();
            if (!messageContent || !state.selectedConvo) return;

            setSendingState(true);

            state.messages.push({ role: 'user', content: messageContent });
            renderMessages(); // Render user message
            scrollToBottom(true); // Force scroll after adding user message
            messageInput.value = '';
            adjustTextareaHeight();

            showTypingIndicator();

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
                        'Authorization': \`Bearer \${state.jwt}\`,
                    },
                    body: JSON.stringify({ message: messageContent, stream: true }),
                    signal: signal,
                });

                removeTypingIndicator();

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || \`HTTP error! Status: \${response.status}\`);
                }

                if (!response.body) {
                     throw new Error("Response body is missing.");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedRawContent = '';
                const assistantMsg = { role: 'assistant', content: '' };
                state.messages.push(assistantMsg);

                // Create the message element structure immediately but leave content empty
                 const messageDiv = createMessageElement(assistantMsg); // Use helper function
                 messagesDiv.appendChild(messageDiv);
                 const contentDiv = messageDiv.querySelector('.message-content'); // Get content div to update

                 scrollToBottom(true); // Scroll the empty bubble into view

                async function readStream() {
                    try {
                         while (true) {
                             const { done, value } = await reader.read();
                             if (done) {
                                 activeRequestController = null;
                                 // Final update to state
                                 assistantMsg.content = accumulatedRawContent;
                                 // Final render pass to ensure everything (like copy buttons) is correct
                                 if (contentDiv) {
                                    const finalHtml = showdownConverter.makeHtml(accumulatedRawContent);
                                    contentDiv.innerHTML = finalHtml;
                                    contentDiv.querySelectorAll('pre code').forEach(hljs.highlightElement); // Highlight all
                                    addCopyButtonsToCodeBlocks(contentDiv); // Add copy buttons
                                 }
                                 setSendingState(false);
                                 return;
                             }

                             const chunk = decoder.decode(value, { stream: true });
                             // Process Server-Sent Events (SSE)
                             const lines = chunk.split('\\n');
                             for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const dataString = line.substring(6);
                                     if (dataString.trim()) {
                                         try {
                                             const parsed = JSON.parse(dataString);
                                             if (parsed.message) {
                                                 accumulatedRawContent += parsed.message;
                                                 // Update the DOM directly for performance
                                                 if(contentDiv) {
                                                     // Convert the *entire accumulated* markdown to HTML
                                                     const currentHtml = showdownConverter.makeHtml(accumulatedRawContent);
                                                     contentDiv.innerHTML = currentHtml;

                                                     // Re-apply highlighting to any *new or changed* code blocks
                                                     contentDiv.querySelectorAll('pre code:not(.hljs)').forEach(hljs.highlightElement);

                                                     // Add copy buttons (will re-add/check)
                                                     addCopyButtonsToCodeBlocks(contentDiv);
                                                 }
                                                 scrollToBottom(); // Scroll smoothly as content arrives
                                             } else if (parsed.done) {
                                                 // Optional: Handle a specific 'done' message if backend sends one
                                                 // console.log("Stream finished signal received.");
                                             }
                                         } catch (parseErr) {
                                             console.warn('Error parsing SSE data chunk:', dataString, parseErr);
                                             // Optionally append raw problematic chunk for debugging
                                             // accumulatedRawContent += \`\\n[Parse Error: \${dataString}]\\n\`;
                                             // if (contentDiv) contentDiv.innerHTML = showdownConverter.makeHtml(accumulatedRawContent);
                                         }
                                     }
                                }
                             } // end for lines
                         } // end while
                    } catch (streamErr) {
                        if (streamErr.name === 'AbortError') {
                            console.log('Stream fetch aborted');
                            if (!accumulatedRawContent) { // If aborted before any content received
                                 messageDiv?.remove(); // Remove the empty assistant message bubble
                                 // Remove from state as well
                                 state.messages.pop();
                            } else {
                                 assistantMsg.content = accumulatedRawContent + "\\n\\n*(Request cancelled)*";
                                 if(contentDiv) {
                                     contentDiv.innerHTML = showdownConverter.makeHtml(assistantMsg.content);
                                 }
                            }
                        } else {
                            console.error('Error reading stream:', streamErr);
                            assistantMsg.content = accumulatedRawContent + "\\n\\n*Error receiving response.*";
                            if(contentDiv) {
                                 contentDiv.innerHTML = showdownConverter.makeHtml(assistantMsg.content);
                            }
                        }
                        removeTypingIndicator(); // Ensure removed on error/abort
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
                 // Maybe remove the user message or add an error state? For now, just log.
            }
        });

        document.getElementById('to-register').addEventListener('click', (e) => { e.preventDefault(); setView('register'); });
        document.getElementById('to-login').addEventListener('click', (e) => { e.preventDefault(); setView('login'); });

        // Logout Listeners (Header and Sidebar)
        logoutButton.addEventListener('click', triggerLogout);
        sidebarLogoutButton.addEventListener('click', triggerLogout);


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

        // --- Conversation Management ---

        async function loadConversations() {
            if (!state.jwt) return;
            try {
                const response = await fetch('/convos', {
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                });
                 if (response.status === 401) {
                     console.warn("Unauthorized fetching convos. Logging out.");
                     triggerLogout(); // Use centralized logout function
                     return;
                 }
                if (!response.ok) {
                    // Handle non-401 errors gracefully
                    console.error(\`Failed to load convos: \${response.status}\`);
                    state.conversations = []; // Assume empty list on error
                    // Optionally show an error message in the sidebar
                    // convoListDiv.innerHTML = '<p style="color:var(--danger-color);">Error loading conversations.</p>';
                } else {
                    const data = await response.json();
                    state.conversations = data || [];
                }
                renderConversations(); // Render whatever state we have (empty or populated)
            } catch (err) {
                console.error('Load conversations fetch error:', err);
                state.conversations = []; // Clear convos on fetch error
                renderConversations(); // Reflect the error state in UI
                // convoListDiv.innerHTML = '<p style="color:var(--danger-color);">Network error loading conversations.</p>';
            }
        }

        function renderConversations() {
            convoListDiv.innerHTML = ''; // Clear previous list
             if (!state.conversations || state.conversations.length === 0) {
                 convoListDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 20px 0;">No conversations yet.</p>';
                 return;
             }

            // Sort conversations, e.g., by updated_at descending (if available)
             state.conversations.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));


            state.conversations.forEach(convo => {
                const div = document.createElement('div');
                div.className = 'convo-item';
                div.dataset.id = convo.id;

                const titleSpan = document.createElement('span');
                titleSpan.textContent = convo.title || 'Untitled';
                titleSpan.title = convo.title || 'Untitled';

                div.addEventListener('click', (e) => {
                     if (e.target.closest('.delete-convo-btn')) return; // Ignore clicks on delete button

                     // Only switch if not already selected, or if user clicks same convo again (useful to reload)
                    // if (state.selectedConvo !== convo.id) {
                         state.selectedConvo = convo.id;
                         // No need to load messages here, handleHashChange will do it via setView
                         setView('conversation', convo.id);
                    // }
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-convo-btn';
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.title = 'Delete Conversation';
                deleteButton.addEventListener('click', async (e) => {
                     e.stopPropagation();
                    if (confirm(\`Are you sure you want to delete "\${convo.title || 'Untitled'}"?\`)) {
                        deleteButton.disabled = true;
                        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        try {
                            const response = await fetch(\`/convo/\${convo.id}\`, {
                                method: 'DELETE',
                                headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                            });
                            if (response.ok) {
                                state.conversations = state.conversations.filter(c => c.id !== convo.id);
                                div.remove(); // Remove element directly
                                if (state.selectedConvo == convo.id) { // Use == for potential type difference
                                    state.selectedConvo = null;
                                    state.messages = [];
                                    renderMessages();
                                    setView('dashboard');
                                }
                                if (state.conversations.length === 0) {
                                     renderConversations(); // Show "No conversations" message
                                }
                            } else {
                                const data = await response.json();
                                alert(\`Failed to delete conversation: \${data.message}\`);
                                deleteButton.disabled = false;
                                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                            }
                        } catch (err) {
                            console.error('Delete convo error:', err);
                            alert('An error occurred while deleting conversation.');
                            deleteButton.disabled = false;
                            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                        }
                    }
                });
                div.appendChild(titleSpan);
                div.appendChild(deleteButton);
                convoListDiv.appendChild(div);
            });
             highlightSelectedConvo(state.selectedConvo); // Highlight after rendering
        }

         function highlightSelectedConvo(convoId) {
            document.querySelectorAll('.convo-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.id === String(convoId));
            });
        }

        async function loadMessages(convoId) {
             if (!state.jwt || !convoId) return;

             // Ensure the conversation view is active before showing loading state
             if (state.currentView !== 'conversation') {
                 setView('conversation', convoId); // Switch view first
             }

             // Find the convo title from state
             const currentConvo = state.conversations.find(c => String(c.id) === String(convoId));
             // Update title if needed (e.g., if a title element exists)
             // convoTitleSpan.textContent = currentConvo ? currentConvo.title : 'Loading...';

             messagesDiv.innerHTML = '<div style="text-align: center; margin-top: 50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color: var(--text-muted);"></i><p style="color: var(--text-muted);">Loading messages...</p></div>';
             try {
                const response = await fetch(\`/convo/\${convoId}\`, {
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                });
                 if (response.status === 401) {
                     console.warn("Unauthorized fetching messages. Logging out.");
                     triggerLogout();
                     return;
                 }
                if (!response.ok) {
                     const data = await response.json().catch(() => ({})); // Try to get error message
                     alert(\`Failed to load messages: \${data.message || response.statusText}\`);
                     messagesDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load messages.</p>';
                     state.messages = []; // Clear messages state on error
                 } else {
                    const data = await response.json();
                    state.messages = data || [];
                    renderMessages(); // Render the loaded messages
                    // Scroll to bottom only after messages are rendered
                     setTimeout(() => scrollToBottom(true), 50); // Small delay allows render paint
                }
            } catch (err) {
                console.error('Load messages fetch error:', err);
                alert('An error occurred while loading messages.');
                 messagesDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color);">An error occurred while loading messages.</p>';
                 state.messages = []; // Clear messages state on error
            }
        }

        // Helper to create message DOM element
        function createMessageElement(msg) {
            if (!msg || !msg.role || typeof msg.content === 'undefined') {
                console.warn("Skipping invalid message object:", msg);
                return null; // Return null for invalid messages
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.dataset.role = msg.role;

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

            // Only add message copy button to non-empty assistant messages
            if (msg.role === 'assistant' && msg.content.trim()) {
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.title = 'Copy message';
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(msg.content).then(() => {
                         copyButton.innerHTML = '<i class="fas fa-check"></i>';
                         copyButton.title = 'Copied!';
                         copyButton.classList.add('copied');
                         setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                            copyButton.title = 'Copy message';
                            copyButton.classList.remove('copied');
                         }, 1500);
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
                const rawHtml = showdownConverter.makeHtml(msg.content || '');
                contentDiv.innerHTML = rawHtml;
                // Apply highlighting and add code block copy buttons AFTER setting innerHTML
                contentDiv.querySelectorAll('pre code').forEach(hljs.highlightElement);
                addCopyButtonsToCodeBlocks(contentDiv);
            } else {
                contentDiv.textContent = msg.content || '';
            }
            bubbleDiv.appendChild(contentDiv);

            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);
            return messageDiv;
        }

        function renderMessages() {
            messagesDiv.innerHTML = ''; // Clear previous messages
            if (!state.messages || state.messages.length === 0) {
                 if (state.currentView === 'conversation') { // Only show prompt if in convo view
                    messagesDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 30px;">Send a message to start the conversation.</p>';
                 }
                 return;
            }

            state.messages.forEach(msg => {
                 const messageElement = createMessageElement(msg);
                 if (messageElement) { // Only append if element creation was successful
                     messagesDiv.appendChild(messageElement);
                 }
            });

             // Scroll handling moved to loadMessages and send message handler
             // scrollToBottom(true); // Don't auto-scroll on every render, only on load/new message
        }


        // --- Hash Change Handler ---
        async function handleHashChange() {
             // Always remove loading state when hash changes, as navigation implies loading is done
             body.classList.remove('loading');

             if (!state.jwt) {
                 // Not logged in - redirect to login unless hash is register/verify
                 const hash = window.location.hash;
                 if (hash === '#register') {
                     setView('register');
                 } else if (hash === '#verify') {
                     setView('verify');
                 } else {
                      // Includes empty hash, #login, or any other hash
                     setView('login');
                 }
                 return;
             }

            // --- Logged In User ---
            const hash = window.location.hash;

            if (hash.startsWith('#convo-')) {
                const convoId = hash.substring(7);
                const convoExists = state.conversations.find(c => String(c.id) === convoId);

                 if (convoExists) {
                     // Only load messages if the selected convo changes
                     if (state.selectedConvo !== convoId) {
                         state.selectedConvo = convoId;
                         await loadMessages(convoId); // This will also call renderMessages and scroll
                     }
                     setView('conversation', convoId); // Ensure view is correct and sidebar item highlighted
                 } else {
                     // Convo ID in hash doesn't exist in state, redirect
                     console.warn(\`Conversation ID \${convoId} not found via hash, redirecting to dashboard.\`);
                     state.selectedConvo = null;
                     setView('dashboard');
                 }
            } else if (hash === '#dashboard') {
                state.selectedConvo = null;
                setView('dashboard');
            } else if (hash === '#login' || hash === '#register' || hash === '#verify') {
                 // Logged in user tried to access auth pages, redirect
                 setView('dashboard');
            } else {
                // Default view for logged-in user (e.g., empty hash)
                setView('dashboard');
            }
        }

        // --- Initialization ---
        window.addEventListener('load', async () => {
            const savedJwt = localStorage.getItem('jwt');
            if (savedJwt) {
                state.jwt = savedJwt;
                body.classList.remove('logged-out');
                body.classList.add('logged-in');

                // Basic user info (can be improved with a /me endpoint)
                // Try decoding JWT payload for email - THIS IS NOT SECURE verification, just display
                 try {
                    const base64Url = state.jwt.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const payload = JSON.parse(jsonPayload);
                    // Assuming email might be in 'email' or 'sub' claim - adjust as needed
                    state.user = { email: payload.email || payload.sub || 'User' };
                } catch (e) {
                    console.warn("Could not decode JWT for email display.", e);
                    state.user = { email: 'User' }; // Fallback
                }
                updateUserInfo();

                 // Load conversations *before* handling hash
                 await loadConversations();

                 // Now handle the hash (which might load messages)
                 await handleHashChange(); // This will also remove loading state

            } else {
                // No token, go to login (handleHashChange will do this, but setView is safer)
                setView('login'); // This also removes loading state
            }

             // Final UI updates just in case
             updateUserInfo();
             adjustTextareaHeight();
        });

        window.addEventListener('hashchange', handleHashChange);

    </script>
</body>
</html>
`;
