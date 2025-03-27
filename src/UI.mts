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
            --modal-backdrop: rgba(0, 0, 0, 0.6);
            --modal-bg: var(--surface-color);
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
            height: 100vh;
            overflow: hidden;
        }
        body.loading main { visibility: hidden; }
        body.logged-out .sidebar,
        body.logged-out #menu-toggle,
        body.logged-out .sidebar-footer,
        body.logged-out #user-email { /* Hide email too */
            display: none;
        }
        body.logged-in #loading-overlay { display: none; }
        /* Hide shared view elements when sharing */
        body.viewing-shared .sidebar,
        body.viewing-shared #menu-toggle,
        body.viewing-shared .sidebar-footer,
        body.viewing-shared #user-info { /* Hide user info block */
            display: none;
        }
        body.viewing-shared header h1 {
             /* Optionally adjust header when viewing shared */
        }
        body.viewing-shared main {
             /* Allow main content to take full width */
        }


        /* Loading Overlay */
        #loading-overlay {
            position: fixed; inset: 0; background-color: var(--bg-color);
            display: flex; align-items: center; justify-content: center;
            z-index: 2000; transition: opacity 0.3s ease;
        }
        #loading-overlay i { font-size: 40px; color: var(--accent-color); }
        body:not(.loading) #loading-overlay { opacity: 0; pointer-events: none; }

        /* Header */
        header {
            background-color: var(--surface-color); padding: 0 20px;
            height: var(--header-height); display: flex; flex-wrap: nowrap;
            justify-content: space-between; align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            position: sticky; top: 0; z-index: 100; flex-shrink: 0;
        }
        #menu-toggle {
            display: none; font-size: 24px; background: none; border: none;
            color: var(--text-color); cursor: pointer; padding: 10px; margin-right: 10px;
        }
        header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        #user-info { display: flex; align-items: center; gap: 15px; }
        #user-email { font-size: 14px; color: var(--text-muted); }
        /* Header logout button removed */

        /* Main Layout */
        main { display: flex; flex: 1; overflow: hidden; }

        /* Sidebar */
        .sidebar {
            width: 260px; background: var(--surface-color); border-right: 1px solid var(--border-color);
            display: flex; flex-direction: column; height: 100%;
            transition: transform 0.3s ease, width 0.3s ease; flex-shrink: 0;
            position: relative; overflow: hidden;
        }
        .sidebar-header {
            padding: 15px; border-bottom: 1px solid var(--border-color);
            display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;
        }
        .sidebar-header h2 { margin: 0 0 5px 0; font-size: 18px; }
        .sidebar-header-actions { display: flex; justify-content: space-between; gap: 10px; }
        .sidebar-content {
            flex: 1; overflow-y: auto; padding: 15px; min-height: 0;
            /* Custom scrollbar */
            scrollbar-width: thin; scrollbar-color: var(--scrollbar-color) var(--scrollbar-track-color);
        }
        .sidebar-content::-webkit-scrollbar { width: 8px; }
        .sidebar-content::-webkit-scrollbar-track { background: var(--scrollbar-track-color); }
        .sidebar-content::-webkit-scrollbar-thumb { background: var(--scrollbar-color); border-radius: 4px; }
        .sidebar-content::-webkit-scrollbar-thumb:hover { background: #666; }
        .sidebar-footer { padding: 15px; border-top: 1px solid var(--border-color); flex-shrink: 0; }
        .sidebar-footer button { width: 100%; }
        #close-sidebar {
            display: none; width: auto; margin-bottom: 10px; align-self: flex-end;
            padding: 5px 10px; font-size: 18px;
        }

        /* Content Area */
        .content {
            flex: 1; display: flex; flex-direction: column;
            overflow: hidden; height: 100%;
            background-color: var(--bg-color); /* Ensure bg for content */
        }

        /* Mobile Sidebar Backdrop */
        .backdrop {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 999;
            display: none; opacity: 0; transition: opacity 0.3s ease;
        }
        .backdrop.open { display: block; opacity: 1; }

        /* View Management */
        .view {
            display: none; width: 100%; height: 100%;
            opacity: 0; transition: opacity 0.4s ease;
            animation: fadeIn 0.4s ease forwards;
            padding: 20px; overflow: auto; max-width: 600px; margin: 0 auto;
        }
        .view.active {
            display: flex; flex-direction: column; align-items: center; opacity: 1;
        }
        /* View Specific Overrides */
        .view-dashboard, .view-login, .view-register, .view-verify, .view-forgot-password, .view-reset-password {
            justify-content: center;
        }
        .view-conversation, .view-shared-conversation {
            max-width: none; padding: 0; overflow: hidden;
        }
        .view-conversation.active, .view-shared-conversation.active {
            display: flex; flex-direction: column; align-items: stretch;
            justify-content: flex-end; /* Input form at bottom */
        }
        /* Shared view specifics */
        .view-shared-conversation #send-form { display: none; }
        .view-shared-conversation .messages-container {
            /* Style Adjust: Add slightly more top padding */
            padding-top: 25px;
        }
        .shared-info-banner {
             background-color: var(--surface-hover);
             padding: 10px 20px;
             text-align: center;
             font-size: 14px;
             color: var(--text-muted);
             border-bottom: 1px solid var(--border-color);
             flex-shrink: 0; /* Prevent shrinking */
        }
        .shared-info-banner a { color: var(--accent-color); }

        /* Login/Register/Verify/Reset Specific Styles */
        .view-login h2, .view-register h2, .view-verify h2, .view-forgot-password h2, .view-reset-password h2 {
            text-align: center; margin-bottom: 25px; font-weight: 500;
        }
        .view-login p, .view-register p, .view-verify p, .view-forgot-password p, .view-reset-password p {
            text-align: center; margin-top: 20px;
        }
        .view-login .welcome-text {
            text-align: center; margin-bottom: 30px; color: var(--text-muted); line-height: 1.6;
        }

        /* Forms and Inputs */
        form {
            display: flex; flex-direction: column; gap: 18px;
            background: var(--surface-color); padding: 30px; border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            width: 100%; max-width: 400px; flex-shrink: 0;
        }
        #send-form { /* Message input form */
            flex-direction: row; align-items: flex-end; padding: 15px;
            margin: 0 20px 20px 20px; max-width: 900px;
            width: calc(100% - 40px); margin-left: auto; margin-right: auto;
            gap: 10px; box-shadow: none; background: var(--surface-color);
            border-radius: 12px; border: 1px solid var(--border-color);
            flex-shrink: 0; position: relative; z-index: 10;
        }
        input, button, textarea, select { /* Added select */
            padding: 12px 15px; font-size: 16px; border: 1px solid var(--border-color);
            border-radius: 8px; font-family: var(--font-family);
        }
        input, textarea, select { background: var(--bg-color); color: var(--text-color); }
        textarea:focus, input:focus, select:focus {
            outline: none; border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(0, 170, 255, 0.3);
        }
        textarea {
            resize: none; line-height: 1.5; overflow-y: hidden; /* Start hidden */
            min-height: calc(1.5em + 26px); /* Adjusted for padding */
            max-height: calc(1.5em * 12 + 26px);
            height: calc(1.5em + 26px);
            width: 100%;
        }
        textarea:disabled { background-color: #2d2d2d; opacity: 0.7; cursor: not-allowed; }

        /* Buttons */
        button {
            background-color: var(--accent-color); color: #ffffff; cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease, opacity 0.2s ease;
            user-select: none; font-weight: 500; border: none;
            display: inline-flex; align-items: center; justify-content: center;
            gap: 8px; flex-shrink: 0; padding: 12px 15px; border-radius: 8px;
        }
        button:hover:not(:disabled) { background-color: var(--accent-hover); transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        button.secondary { background-color: var(--surface-hover); color: var(--text-muted); border: 1px solid var(--border-color); }
        button.secondary:hover:not(:disabled) { background-color: #404040; }
        button.danger { background-color: var(--danger-color); }
        button.danger:hover:not(:disabled) { background-color: var(--danger-hover); }
        button#sidebar-logout { background-color: var(--danger-color); width: 100%; }
        button#sidebar-logout:hover:not(:disabled) { background-color: var(--danger-hover); }
        button#create-convo { flex-grow: 1; }
        button#clear-all { background-color: var(--surface-hover); color: var(--text-muted); border: 1px solid var(--border-color); }
        button#clear-all:hover:not(:disabled) { background-color: var(--danger-color); color: white; border-color: var(--danger-color); }

        /* Copy Buttons */
        .copy-btn {
            background: var(--surface-hover); color: var(--text-muted);
            padding: 4px 8px; font-size: 12px; border: none; border-radius: 5px;
            opacity: 0.7; transition: opacity 0.2s ease, background-color 0.2s ease;
            cursor: pointer; line-height: 1; /* Ensure icon fits */
            min-width: auto; /* Override default button padding */
            height: auto; /* Override default button padding */
        }
        .message-header:hover .copy-btn, .code-block-wrapper:hover .copy-btn { opacity: 1; }
        .copy-btn:hover { background: var(--accent-color); color: white; }
        .copy-btn.copied { background: var(--success-color); color: white; }
        .code-block-wrapper { position: relative; margin: 10px 0; }
        .code-block-wrapper .copy-btn { position: absolute; top: 8px; right: 8px; z-index: 1; opacity: 0; }
        .code-block-wrapper pre { margin: 0; position: relative; }

        a { color: var(--accent-color); text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }

        /* Conversations Sidebar */
        .convo-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 12px; background: transparent; border-radius: 6px;
            margin-bottom: 5px; cursor: pointer; user-select: none;
            transition: background-color 0.2s ease; position: relative;
        }
        .convo-item:hover { background: var(--surface-hover); }
        .convo-item.selected { background: var(--accent-color); color: white; }
        .convo-item.selected:hover { background: var(--accent-hover); }
        .convo-item span {
            flex: 1; white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis;
            /* Style Adjust: Increase space between title and buttons */
            margin-right: 8px;
            font-size: 15px;
        }
        .convo-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .convo-item button { /* Edit/Delete buttons in sidebar */
            background: transparent; color: var(--text-muted);
            padding: 3px 5px; font-size: 13px; /* Smaller icon buttons */
            opacity: 0; /* Hide by default */
            transition: opacity 0.2s ease, color 0.2s ease;
            line-height: 1; min-width: auto; height: auto; /* Compact */
        }
        .convo-item:hover button { opacity: 0.8; } /* Show on convo hover */
        .convo-item button:hover { color: var(--accent-color); opacity: 1; background: transparent; transform: none; }
        .convo-item button.delete-convo-btn:hover { color: var(--danger-color); }
        .convo-item.selected button { color: rgba(255, 255, 255, 0.7); opacity: 0.7; } /* Make visible on selected */
        .convo-item.selected:hover button { opacity: 1; } /* Ensure fully visible on selected hover */
        .convo-item.selected button:hover { color: white; background-color: rgba(0, 0, 0, 0.2); }
        .convo-item.selected button.delete-convo-btn:hover { color: var(--danger-color); background-color: rgba(0, 0, 0, 0.2); }

        /* Messages Area */
        .messages-container {
            flex: 1; overflow-y: auto;
            padding: 20px 20px 5px 20px; display: flex; flex-direction: column;
            min-height: 0;
            /* Custom scrollbar */
            scrollbar-width: thin; scrollbar-color: var(--scrollbar-color) var(--bg-color);
        }
        .messages-container::-webkit-scrollbar { width: 8px; }
        .messages-container::-webkit-scrollbar-track { background: var(--bg-color); }
        .messages-container::-webkit-scrollbar-thumb { background: var(--scrollbar-color); border-radius: 4px; }
        .messages-container::-webkit-scrollbar-thumb:hover { background: #666; }
        #messages, #shared-messages { /* Apply common styles to both */
            display: flex; flex-direction: column; gap: 25px;
            width: 100%; max-width: 800px; margin: 0 auto; padding-bottom: 15px;
        }
        .message { display: flex; gap: 12px; align-items: flex-start; }
        .message-avatar {
            width: 32px; height: 32px; border-radius: 50%; background: var(--surface-hover);
            color: var(--text-muted); display: flex; align-items: center; justify-content: center;
            font-size: 16px; flex-shrink: 0; margin-top: 2px;
        }
        .message-bubble { flex: 1; display: flex; flex-direction: column; }
        .message-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 6px; height: 20px; /* Ensure header has height for copy btn */
        }
        .message-header .role { font-weight: 700; font-size: 15px; }
        .message-content {
            background: var(--surface-color); padding: 12px 15px; border-radius: 10px;
            border-top-left-radius: 0; line-height: 1.6;
            overflow-wrap: break-word; word-break: break-word;
        }
        .message[data-role="user"] .message-content {
            background: var(--accent-color); color: white;
            border-top-left-radius: 10px; border-top-right-radius: 0;
        }
        /* Code block styling */
        .message-content pre {
            background-color: var(--bg-color); padding: 15px; border-radius: 8px;
            overflow-x: auto; border: 1px solid var(--border-color);
            scrollbar-width: thin; scrollbar-color: var(--scrollbar-color) var(--bg-color);
        }
        .message-content pre::-webkit-scrollbar { height: 6px; }
        .message-content pre::-webkit-scrollbar-track { background: var(--bg-color); }
        .message-content pre::-webkit-scrollbar-thumb { background-color: var(--scrollbar-color); border-radius: 3px; }
        .message-content pre code { background: none; padding: 0; color: inherit; font-size: 0.9em; white-space: pre; }
        .message-content p:first-child { margin-top: 0; }
        .message-content p:last-child { margin-bottom: 0; }
        .message-content table { width: 100%; border-collapse: collapse; margin: 15px 0; background-color: var(--bg-color); }
        .message-content th, .message-content td { border: 1px solid var(--border-color); padding: 8px 12px; text-align: left; }
        .message-content th { background-color: var(--surface-hover); }

        /* Conversation Header (Title + Actions) */
        .conversation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: var(--surface-color);
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
        }
        .conversation-header h2 {
            margin: 0;
            font-size: 18px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-grow: 1; /* Allow title to take space */
            margin-right: 15px; /* Space before buttons */
        }
        .conversation-header-actions {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
        }
         .conversation-header-actions button {
             padding: 6px 10px; /* Smaller buttons */
             font-size: 14px;
             background: var(--surface-hover);
             color: var(--text-muted);
         }
         .conversation-header-actions button:hover:not(:disabled) {
              background: var(--accent-color);
              color: white;
              transform: none; /* No lift */
         }
          .conversation-header-actions button.danger:hover:not(:disabled) {
              background: var(--danger-color);
              color: white;
         }


        /* Typing Indicator */
        .typing-indicator { /* Used inside a message bubble */
            display: flex; align-items: center; gap: 5px;
            padding: 10px 15px; background: var(--surface-color); border-radius: 10px;
            border-top-left-radius: 0; align-self: flex-start;
        }
        .typing-indicator span {
            width: 8px; height: 8px; background-color: var(--text-muted);
            border-radius: 50%; animation: bounce 1.2s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

        /* Modal Styles */
        .modal-overlay {
            position: fixed; inset: 0; background-color: var(--modal-backdrop);
            display: flex; align-items: center; justify-content: center;
            z-index: 2000; opacity: 0; visibility: hidden;
            transition: opacity 0.3s ease, visibility 0s 0.3s linear;
        }
        .modal-overlay.open { opacity: 1; visibility: visible; transition: opacity 0.3s ease; }
        .modal {
            background-color: var(--modal-bg); border-radius: 10px;
            padding: 25px 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            width: 90%; max-width: 450px; transform: scale(0.95);
            transition: transform 0.3s ease; text-align: center;
        }
        .modal-overlay.open .modal { transform: scale(1); }
        .modal h3 { margin-top: 0; margin-bottom: 15px; font-weight: 500; font-size: 18px;}
        .modal p { margin-bottom: 25px; color: var(--text-muted); line-height: 1.6; }
        .modal .modal-input { /* Style for prompt input */
             width: 100%; margin-bottom: 20px; background-color: var(--bg-color);
             color: var(--text-color); border: 1px solid var(--border-color);
             padding: 10px 12px; border-radius: 6px; font-size: 16px;
        }
        .modal .modal-input:focus { outline: none; border-color: var(--accent-color); }
        .modal .modal-actions { display: flex; justify-content: center; gap: 15px; }
        .modal .modal-actions button { padding: 10px 20px; font-size: 15px; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Responsive Design */
        @media (max-width: 767px) {
            body { height: 100vh; }
            header { height: 60px; padding: 0 15px; }
            #menu-toggle { display: block; }
            .sidebar {
                position: fixed; top: 0; left: 0; width: 280px; height: 100%;
                transform: translateX(-100%); z-index: 1000; border-right: none;
                box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
            }
            .sidebar.open { transform: translateX(0); }
            #close-sidebar { display: inline-flex; }
            .content { height: calc(100vh - var(--header-height)); }
            .view { padding: 15px; max-width: 100%; }
            #user-email { display: none; } /* Keep hidden on mobile header */
            #messages, #shared-messages { max-width: 100%; } /* Allow full width on mobile */
            #send-form { margin: 0 10px 10px 10px; width: calc(100% - 20px); padding: 10px; }
            .message-content { font-size: 15px; }
            .messages-container { padding: 15px 10px 5px 10px; }
            .view-shared-conversation .messages-container {
                padding-top: 15px; /* Reset shared top padding for mobile */
            }
            .conversation-header h2 { font-size: 16px; margin-right: 10px; }
            .conversation-header-actions button { padding: 5px 8px; font-size: 13px; gap: 5px; }
            .modal { width: 95%; padding: 20px 25px; }
            .modal .modal-actions { flex-direction: column; gap: 10px; }
            .modal .modal-actions button { width: 100%; }
        }
        @media (min-width: 768px) {
             body:not(.viewing-shared) .sidebar { /* Ensure sidebar shows on desktop unless viewing shared */
                display: flex; height: calc(100vh - var(--header-height));
                position: static; transform: none; box-shadow: none;
                border-right: 1px solid var(--border-color);
            }
             .content { height: calc(100vh - var(--header-height)); }
        }

    </style>
</head>
<body class="loading logged-out"> <!-- Start loading and logged-out -->

    <div id="loading-overlay"><i class="fas fa-spinner fa-spin"></i></div>

    <header>
        <button id="menu-toggle"><i class="fas fa-bars"></i></button>
        <h1><i class="fas fa-brain" style="margin-right: 8px; color: var(--accent-color);"></i>Genius System</h1>
        <div id="user-info">
            <span id="user-email"></span>
            <!-- Logout button removed from header -->
        </div>
    </header>

    <div class="backdrop"></div>

    <main>
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <button id="close-sidebar"><i class="fas fa-times"></i></button>
                <h2>Conversations</h2>
                <div class="sidebar-header-actions">
                    <button id="create-convo"><i class="fas fa-plus"></i> New Chat</button>
                </div>
            </div>
            <div class="sidebar-content">
                <div id="convo-list"></div>
            </div>
            <div class="sidebar-footer">
                <button style="margin-bottom: 8px;" title="Buy me a beer" onclick="window.open('https://donate.stripe.com/aEUcMQ89H39xcBGeUU', '_blank')"> Buy me a beer 🍺</button>
                <button style="margin-bottom: 8px;" id="clear-all" title="Delete All Conversations" class="danger"><i class="fas fa-trash-alt"></i> Clear all chats</button>
                <button id="sidebar-logout" class="danger"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="content">
            <!-- Login View -->
            <div class="view view-login">
                 <div class="welcome-text">
                    <h2>Welcome to Genius</h2>
                    <p>Your intelligent assistant. Log in or register to begin.</p>
                </div>
                <form id="login-form">
                    <input type="email" id="login-email" placeholder="Email" required autocomplete="email">
                    <input type="password" id="login-password" placeholder="Password" required autocomplete="current-password">
                    <button type="submit"><i class="fas fa-sign-in-alt"></i> Login</button>
                </form>
                <p>
                    <a href="#forgot-password" id="to-forgot-password">Forgot Password?</a>
                </p>
                <p>Don't have an account? <a href="#register" id="to-register">Register</a></p>
            </div>

            <!-- Register View -->
            <div class="view view-register">
                <h2>Register Account</h2>
                <form id="register-form">
                    <input type="email" id="register-email" placeholder="Email" required autocomplete="email">
                    <input type="password" id="register-password" placeholder="Password (strong recommended)" required autocomplete="new-password">
                    <input type="password" id="register-confirm-password" placeholder="Confirm Password" required autocomplete="new-password">
                    <button type="submit"><i class="fas fa-user-plus"></i> Register</button>
                </form>
                <p>Already have an account? <a href="#login" id="to-login">Login</a></p>
            </div>

            <!-- Verify Email View -->
            <div class="view view-verify">
                <h2>Verify Your Email</h2>
                 <p style="margin-bottom: 20px; color: var(--text-muted);">Enter the 6-character code sent to your email address.</p>
                <form id="verify-form">
                    <input type="email" id="verify-email" placeholder="Email" required readonly style="background-color: #2d2d2d; cursor: not-allowed;">
                    <input type="text" id="verify-code" placeholder="Verification Code" required inputmode="numeric" pattern="[A-Z0-9]{6}" maxlength="6" style="text-transform: uppercase;">
                    <button type="submit"><i class="fas fa-check-circle"></i> Verify</button>
                </form>
                <button id="resend-code" class="secondary" style="margin-top: 15px; background: none; border: none; color: var(--accent-color);"><i class="fas fa-redo"></i> Resend Code</button>
                 <p><a href="#login" id="back-to-login-verify">Back to Login</a></p>
            </div>

             <!-- Forgot Password View -->
            <div class="view view-forgot-password">
                <h2>Forgot Password</h2>
                 <p style="margin-bottom: 20px; color: var(--text-muted);">Enter your email address. If an account exists, we'll send you a password reset link.</p>
                <form id="forgot-password-form">
                    <input type="email" id="forgot-email" placeholder="Email" required autocomplete="email">
                    <button type="submit"><i class="fas fa-paper-plane"></i> Send Reset Link</button>
                </form>
                 <p><a href="#login" id="back-to-login-forgot">Back to Login</a></p>
            </div>

             <!-- Reset Password View -->
            <div class="view view-reset-password">
                <h2>Reset Your Password</h2>
                 <p style="margin-bottom: 20px; color: var(--text-muted);">Enter and confirm your new password.</p>
                <form id="reset-password-form">
                     <input type="hidden" id="reset-token"> <!-- Token will be populated from URL -->
                    <input type="password" id="reset-new-password" placeholder="New Password" required autocomplete="new-password">
                    <input type="password" id="reset-confirm-password" placeholder="Confirm New Password" required autocomplete="new-password">
                    <button type="submit"><i class="fas fa-save"></i> Set New Password</button>
                </form>
                 <p><a href="#login" id="back-to-login-reset">Back to Login</a></p>
            </div>


            <!-- Dashboard View (Placeholder) -->
            <div class="view view-dashboard">
                 <div style="text-align: center;">
                    <i class="fas fa-comments" style="font-size: 48px; color: var(--accent-color); margin-bottom: 20px;"></i>
                    <p style="font-size: 18px; color: var(--text-muted);">Select or create a conversation to start chatting.</p>
                </div>
            </div>

            <!-- Conversation View -->
            <div class="view view-conversation">
                 <!-- Header for Title and Actions -->
                 <div class="conversation-header">
                     <h2 id="conversation-title">Conversation</h2>
                     <div class="conversation-header-actions">
                         <button id="share-convo-button" title="Share Conversation"><i class="fas fa-share-alt"></i> Share</button>
                         <button id="rename-convo-button" title="Rename Conversation"><i class="fas fa-pencil-alt"></i> Rename</button>
                         <button id="delete-convo-button" title="Delete Conversation" class="danger"><i class="fas fa-trash-alt"></i> Delete</button>
                     </div>
                 </div>
                 <!-- Messages -->
                <div class="messages-container">
                    <div id="messages"></div>
                </div>
                 <!-- Input Form -->
                <form id="send-form">
                    <textarea id="message-input" placeholder="Type your message... (Shift+Enter for new line)" rows="1"></textarea>
                    <button type="submit" id="send-button" title="Send Message"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>

             <!-- Shared Conversation View -->
            <div class="view view-shared-conversation">
                 <div class="shared-info-banner">
                     Viewing a shared conversation snapshot. <a href="/">Go to Genius System</a>
                 </div>
                 <div class="conversation-header">
                     <h2 id="shared-conversation-title">Shared Conversation</h2>
                     <!-- No actions for shared view -->
                 </div>
                <div class="messages-container">
                    <div id="shared-messages"></div>
                </div>
                <!-- No input form for shared view -->
            </div>

        </div><!-- end .content -->
    </main>

     <!-- Modal Structure -->
    <div id="modal-overlay" class="modal-overlay">
        <div id="modal" class="modal">
            <h3 id="modal-title">Modal Title</h3>
            <p id="modal-message">Modal message goes here.</p>
            <input type="text" id="modal-input" class="modal-input" style="display: none;"> <!-- Input for prompt -->
            <div id="modal-actions" class="modal-actions">
                <!-- Buttons added dynamically -->
            </div>
        </div>
    </div>


    <script>
        const showdownConverter = new showdown.Converter({
            tables: true, tasklists: true, strikethrough: true,
            simplifiedAutoLink: true, openLinksInNewWindow: true,
            backslashEscapesHTMLTags: true
        });
        hljs.configure({ ignoreUnrecognizedLanguage: true });

        // --- Application State ---
        const state = {
            currentView: null,
            jwt: null,
            user: null, // { id, email, verified, createdAt } fetched from /me
            conversations: [], // { id, title, user_id, created_at, updated_at, share_token, shared_at }
            selectedConvoId: null,
            messages: [], // { id, convo_id, role, content, created_at, updated_at }
            sharedConvoData: null, // { title, sharedAt, messages }
            isSending: false,
            isLoading: true, // Start in loading state
        };

        let typingIndicator = null;
        let activeRequestController = null;
        let sseSource = null; // Store the EventSource object

        // --- DOM Elements ---
        const $ = (selector) => document.querySelector(selector);
        const $$ = (selector) => document.querySelectorAll(selector);

        const body = document.body;
        const loadingOverlay = $('#loading-overlay');
        const sidebar = $('.sidebar');
        const backdrop = $('.backdrop');
        const messageInput = $('#message-input');
        const sendButton = $('#send-button');
        const messagesContainer = $('.view-conversation .messages-container');
        const messagesDiv = $('#messages');
        const userEmailSpan = $('#user-email');
        const sidebarLogoutButton = $('#sidebar-logout');
        const convoListDiv = $('#convo-list');
        const conversationTitleH2 = $('#conversation-title');
        const sharedConversationTitleH2 = $('#shared-conversation-title');
        const sharedMessagesDiv = $('#shared-messages');

        // Modal elements
        const modalOverlay = $('#modal-overlay');
        const modal = $('#modal');
        const modalTitle = $('#modal-title');
        const modalMessage = $('#modal-message');
        const modalInput = $('#modal-input');
        const modalActions = $('#modal-actions');

        // --- Utility Functions ---

        function setLoadingState(isLoading) {
            state.isLoading = isLoading;
            body.classList.toggle('loading', isLoading);
        }

        // Simple Debounce Function
        function debounce(func, wait) {
          let timeout;
          return function executedFunction(...args) {
            const later = () => {
              clearTimeout(timeout);
              func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        }


        // --- Modal System ---
        let currentModalResolver = null;

        function showModal({ title, message, input = null, buttons = [{ text: 'OK', type: 'primary' }] }) {
            return new Promise((resolve) => {
                currentModalResolver = resolve; // Store the resolver

                modalTitle.textContent = title;
                modalMessage.innerHTML = message; // Use innerHTML to allow basic formatting

                modalInput.style.display = input ? 'block' : 'none';
                modalInput.value = input?.value || '';
                modalInput.placeholder = input?.placeholder || '';
                if (input) setTimeout(() => modalInput.focus(), 100); // Focus input after modal animation

                modalActions.innerHTML = ''; // Clear previous buttons

                buttons.forEach(buttonConfig => {
                    const button = document.createElement('button');
                    button.textContent = buttonConfig.text;
                    button.classList.add(buttonConfig.type === 'danger' ? 'danger' : (buttonConfig.type === 'secondary' ? 'secondary' : 'primary'));
                    button.onclick = () => {
                         const result = { confirmed: buttonConfig.value !== false }; // Usually true unless explicitly 'Cancel' (value: false)
                         if (input) {
                             result.value = modalInput.value; // Include input value if present
                         }

                         // Resolve the promise FIRST
                         if (currentModalResolver) {
                            currentModalResolver(result);
                            currentModalResolver = null; // Clear resolver *before* calling closeModal
                         }
                         // THEN close the modal visually
                         closeModal();
                         // --- MODAL FIX END ---
                    };
                    modalActions.appendChild(button);
                });

                modalOverlay.classList.add('open'); // Make the modal visible
            });
        }

        function closeModal() {
            modalOverlay.classList.remove('open'); // Visually hide the modal

            // --- MODAL FIX START ---
            // If the modal is closed unexpectedly (e.g., overlay click)
            // and a resolver still exists, resolve it as 'cancelled'.
            if (currentModalResolver) {
                 console.log("Modal closed unexpectedly, resolving as cancelled."); // Optional: for debugging
                 currentModalResolver({ confirmed: false }); // Resolve with cancelled state
                 currentModalResolver = null;
            }
            // --- MODAL FIX END ---
        }

         // Close modal if clicking overlay
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal(); // This will now correctly trigger the 'cancelled' resolution if needed
            }
        });
        // Optional: Add ESC key listener to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
                closeModal();
            }
        });


        // Helper functions using the modal system
        async function showAlert(title, message) {
            await showModal({ title, message, buttons: [{ text: 'OK' }] });
        }

        async function showConfirm(title, message) {
            const { confirmed } = await showModal({
                title, message,
                buttons: [
                    { text: 'Cancel', type: 'secondary', value: false },
                    { text: 'Confirm', type: 'primary' } // Default confirmed: true
                ]
            });
            return confirmed;
        }

        async function showPrompt(title, message, inputOptions = {}) {
             // Ensure inputOptions is an object
             const inputConf = typeof inputOptions === 'object' && inputOptions !== null ? inputOptions : {};
            const { confirmed, value } = await showModal({
                title, message,
                input: { value: inputConf.value || '', placeholder: inputConf.placeholder || '' },
                buttons: [
                    { text: 'Cancel', type: 'secondary', value: false },
                    { text: 'OK', type: 'primary' }
                ]
            });
            return confirmed ? value : null; // Return input value if confirmed, else null
        }


        // --- View Management & Routing ---
        function setView(viewName, params = {}) {
            if (state.currentView === viewName && viewName !== 'conversation' && viewName !== 'shared-conversation') return;

             // Abort any ongoing AI request when changing views
             abortActiveRequest();

            // Close SSE connection if changing away from conversation view
            if (state.currentView === 'conversation' && viewName !== 'conversation' && sseSource) {
                closeSseConnection();
            }


            $$('.view').forEach(view => view.classList.remove('active'));
            const targetView = $(\`.view-\${ viewName }\`);
            if (targetView) {
                targetView.classList.add('active');
            } else {
                console.error(\`View "\${viewName}" not found.Falling back to dashboard / login.\`);
                viewName = state.jwt ? 'dashboard' : 'login';
                $(\`.view-\${ viewName }\`)?.classList.add('active');
            }
            state.currentView = viewName; // Update state AFTER view switch
            state.sharedConvoData = null; // Clear shared data when changing main view

            // Close sidebar on mobile navigation
            if (window.innerWidth < 768) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('open');
            }

            // Update URL Hash & Body Class
            let newHash = '#';
             body.classList.remove('viewing-shared'); // Default: not viewing shared

             if (viewName === 'conversation' && params.convoId) {
                 newHash = \`#convo-\${ params.convoId }\`;
                 state.selectedConvoId = String(params.convoId); // Ensure string comparison later
                 highlightSelectedConvo(state.selectedConvoId);
                 updateConversationHeader(state.selectedConvoId);
                 // Focus input with a slight delay after view transition
                 setTimeout(() => messageInput?.focus(), 50);
             } else if (viewName === 'shared-conversation' && params.token) {
                 newHash = \`#share-\${ params.token }\`;
                 state.selectedConvoId = null; // No selected convo when viewing shared
                 highlightSelectedConvo(null);
                 body.classList.add('viewing-shared');
             } else if (['dashboard', 'login', 'register', 'verify', 'forgot-password', 'reset-password'].includes(viewName)) {
                newHash = \`#\${ viewName }\`;
                if (viewName === 'reset-password' && params.token) {
                     $('#reset-token').value = params.token; // Populate hidden token field
                 }
                 state.selectedConvoId = null;
                 highlightSelectedConvo(null);
            } else {
                 // Fallback case (e.g., unknown view name)
                 newHash = state.jwt ? '#dashboard' : '#login';
                 state.selectedConvoId = null;
                 highlightSelectedConvo(null);
            }

            // Update hash only if different
            if (window.location.hash !== newHash) {
                 // Use replaceState to avoid polluting history for simple view changes
                 // history.replaceState(null, '', newHash); // Causes issues with back button, revert to hash change
                 window.location.hash = newHash;
            }

            // Update body login class
            body.classList.toggle('logged-in', !!state.jwt);
            body.classList.toggle('logged-out', !state.jwt);

            setLoadingState(false); // View is set, loading is finished
        }

         async function handleHashChange() {
             setLoadingState(false); // Always stop loading on hash change
             const hash = window.location.hash;

             // --- Handle Shared Links First (No Auth Required) ---
             if (hash.startsWith('#share-')) {
                 const token = hash.substring(7);
                 await loadSharedConversation(token);
                 return; // Stop further processing
             }

             // --- Handle Auth Routes (No Auth Required) ---
             if (!state.jwt) {
                 if (hash === '#register') setView('register');
                 else if (hash === '#verify') setView('verify');
                 else if (hash === '#forgot-password') setView('forgot-password');
                 else if (hash.startsWith('#reset-password')) {
                     const urlParams = new URLSearchParams(window.location.search); // Check query params from email link
                     const token = urlParams.get('token') || hash.split('?token=')[1]; // Allow token in hash too
                     if (token) setView('reset-password', { token });
                     else setView('login'); // No token, redirect to login
                 }
                 else setView('login'); // Default for logged out
                 return;
             }

             // --- Handle Logged-In Routes ---
             if (hash.startsWith('#convo-')) {
                 const convoId = hash.substring(7);
                 const convoExists = state.conversations.find(c => String(c.id) === convoId);
                 if (convoExists) {
                      const needsLoad = String(state.selectedConvoId) !== convoId || state.messages.length === 0;
                      setView('conversation', { convoId }); // Set the view FIRST so state.currentView is correct

                      if (needsLoad) {
                          await loadMessages(convoId); // Now load messages
                      }
                      // *** FIX END ***
                 } else {
                     console.warn(\`Convo ID \${convoId} not found, redirecting.\`);
                      await showAlert('Not Found', \`Conversation with ID \${convoId} could not be found or accessed.\`);
                     setView('dashboard');
                 }
             } else if (hash === '#dashboard') {
                 setView('dashboard');
             } else if (hash === '#login' || hash === '#register' || hash === '#verify' || hash === '#forgot-password' || hash.startsWith('#reset-password')) {
                 // Logged in user on auth page -> redirect
                 setView('dashboard');
             } else {
                 // Default view for logged-in (empty hash, unknown hash)
                 setView('dashboard');
             }
         }

        // --- User Info & Auth ---
        async function fetchUserInfo() {
             if (!state.jwt) return;
             try {
                 const response = await fetch('/me', { headers: { 'Authorization': \`Bearer \${state.jwt}\` } });
                 if (response.status === 401) throw new Error('Unauthorized');
                 if (!response.ok) throw new Error('Failed to fetch user info');
                 state.user = await response.json();
                 updateUserInfoUI();
             } catch (err) {
                  console.error("Failed to fetch user info:", err.message);
                  if (err.message === 'Unauthorized') {
                      triggerLogout(true); // Pass true to indicate session expiry
                  } else {
                     // Keep existing token but maybe show error?
                     // For now, just log it. UI relies on state.user.email which might be null.
                     updateUserInfoUI(); // Update UI even if fetch fails (might clear email)
                  }
             }
        }

        function updateUserInfoUI() {
            if (state.user?.email) {
                userEmailSpan.textContent = state.user.email;
                userEmailSpan.style.display = ''; // Ensure visible
            } else {
                userEmailSpan.textContent = '';
                 userEmailSpan.style.display = 'none'; // Hide if no email
            }
            // Body class handles sidebar/button visibility
            body.classList.toggle('logged-in', !!state.jwt);
            body.classList.toggle('logged-out', !state.jwt);
        }

        function triggerLogout(sessionExpired = false) {
            console.log("Triggering logout.");
            // Abort ongoing requests and close SSE
            abortActiveRequest();
            closeSseConnection();

            localStorage.removeItem('jwt');
            state.jwt = null;
            state.user = null;
            state.conversations = [];
            state.selectedConvoId = null;
            state.messages = [];
            state.sharedConvoData = null;
            renderConversations(); // Clear sidebar
            renderMessages(); // Clear messages view
            updateUserInfoUI(); // Clear user email etc.
            setView('login'); // Go back to login screen

            if (sessionExpired) {
                showAlert("Session Expired", "Your session has expired or is invalid. Please log in again.");
            }
        }

        // --- Textarea & Sending State ---
        function adjustTextareaHeight() {
             if (!messageInput) return;
            // Temporarily reset height to allow calculation
            messageInput.style.height = 'auto';
            const scrollHeight = messageInput.scrollHeight;
            const computedStyle = window.getComputedStyle(messageInput);
            // Include border + padding in height calculation
            const borderTop = parseInt(computedStyle.borderTopWidth, 10);
            const borderBottom = parseInt(computedStyle.borderBottomWidth, 10);
            const paddingTop = parseInt(computedStyle.paddingTop, 10);
            const paddingBottom = parseInt(computedStyle.paddingBottom, 10);
            const boxSizing = computedStyle.boxSizing;

            let contentHeight = scrollHeight;
            if (boxSizing === 'border-box') {
                // scrollHeight includes padding but not border in border-box
                contentHeight += borderTop + borderBottom;
            } else {
                 // scrollHeight is content only in content-box
                 contentHeight += paddingTop + paddingBottom + borderTop + borderBottom;
            }

            const maxHeight = parseInt(computedStyle.maxHeight, 10);

            if (maxHeight && contentHeight > maxHeight) {
                messageInput.style.height = \`\${maxHeight}px\`;
                messageInput.style.overflowY = 'auto';
            } else {
                messageInput.style.height = \`\${contentHeight}px\`;
                messageInput.style.overflowY = 'hidden';
            }
        }

        function setSendingState(isSending) {
            state.isSending = isSending;
            if (!messageInput || !sendButton) return;

            messageInput.disabled = isSending;
            sendButton.disabled = isSending;
            sendButton.innerHTML = isSending
                ? '<i class="fas fa-spinner fa-spin"></i>'
                : '<i class="fas fa-paper-plane"></i>';

            if (!isSending) {
                 messageInput.value = ''; // Clear input after send attempt
                 adjustTextareaHeight(); // Reset height after clearing
                 setTimeout(() => messageInput.focus(), 0); // Refocus after clearing
            }
        }

        // --- SSE Connection Management ---
         function closeSseConnection() {
             if (sseSource) {
                 console.log("Closing existing SSE connection.");
                 sseSource.close();
                 sseSource = null;
                 removeTypingIndicator(); // Clean up UI state on close
                 if(state.isSending) setSendingState(false); // Ensure sending state is reset
             }
         }

         function establishSseConnection(convoId, userMessageContent) {
             closeSseConnection(); // Ensure no duplicate connections

             // Store user message immediately for rendering
             const tempUserMessage = { role: 'user', content: userMessageContent, created_at: new Date().toISOString(), tempId: Date.now() };
             state.messages.push(tempUserMessage);
             renderMessages();
             scrollToBottom(true);

             showTypingIndicator();
             setSendingState(true); // Set sending state immediately

             // Use fetch with stream instead of EventSource
             streamFetchResponse(convoId, userMessageContent);
         }

         // --- Fetch with Streaming Response ---
        async function streamFetchResponse(convoId, userMessageContent) {
             // Abort previous request if any
             abortActiveRequest();
             activeRequestController = new AbortController();
             const signal = activeRequestController.signal;

             // Render user message (already done in establishSseConnection, but ensure it's there)
             if (!state.messages.some(m => m.content === userMessageContent && m.role === 'user')) {
                 const tempUserMessage = { role: 'user', content: userMessageContent, created_at: new Date().toISOString(), tempId: Date.now() };
                 state.messages.push(tempUserMessage);
                 renderMessages();
                 scrollToBottom(true);
             }

             showTypingIndicator();
             setSendingState(true);

             try {
                 const response = await fetch(\`/send/\${convoId}\`, {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json',
                         'Authorization': \`Bearer \${state.jwt}\`,
                         'Accept': 'text/event-stream' // Indicate we prefer SSE if backend supports negotiation
                     },
                     body: JSON.stringify({ message: userMessageContent, stream: true }), // Explicitly request stream
                     signal: signal,
                 });

                 removeTypingIndicator();

                 if (!response.ok) {
                     let errorData = { message: \`HTTP error! Status: \${response.status}\` };
                     try { errorData = await response.json(); } catch {}
                     if (response.status === 401) {
                          triggerLogout(true); // Unauthorized
                          return; // Stop processing
                     }
                     throw new Error(errorData.message || \`HTTP error! Status: \${response.status}\`);
                 }

                 if (!response.body) throw new Error("Response body is missing.");
                 if (response.headers.get('Content-Type')?.includes('application/json')) {
                      // Fallback: Backend didn't stream, process as JSON
                      console.warn("Received JSON response instead of stream. Processing non-streamed.");
                      const data = await response.json();
                      handleNonStreamedResponse(data);
                      setSendingState(false);
                      activeRequestController = null;
                      return;
                 }

                 // --- Process Stream ---
                 const reader = response.body.getReader();
                 const decoder = new TextDecoder();
                 let buffer = '';
                 let assistantMsg = null; // Full message object
                 let contentDiv = null; // Direct reference to content DOM element
                 let accumulatedRawContent = '';

                 while (true) {
                     if (signal.aborted) {
                          console.log("Stream reading aborted by controller.");
                          if (reader) reader.cancel(); // Attempt to cancel the reader
                          throw new Error('AbortError'); // Trigger AbortError handling
                     }

                     const { done, value } = await reader.read();
                     if (done) {
                         console.log("Stream finished.");
                         // Ensure final state is updated if needed (though should be done by 'final' event)
                         if (assistantMsg && assistantMsg.content !== accumulatedRawContent) {
                              console.warn("Stream ended with mismatched content. Updating state.");
                              assistantMsg.content = accumulatedRawContent;
                              // Optionally re-render the final message content if needed
                              // if (contentDiv) { renderMessageContent(contentDiv, assistantMsg); }
                         }
                         setSendingState(false);
                         activeRequestController = null;
                         break; // Exit loop
                     }

                     buffer += decoder.decode(value, { stream: true });
                     const lines = buffer.split('\\n');
                     buffer = lines.pop() || ''; // Keep potential partial line

                     for (const line of lines) {
                         if (line.startsWith('data: ')) {
                             const dataString = line.substring(6);
                             if (dataString.trim()) {
                                 try {
                                     const parsed = JSON.parse(dataString);
                                     // --- Process Different SSE Event Types ---
                                      if (parsed.type === 'userMessage' && parsed.messageId) {
                                           // Backend confirms user message saved, update temp message ID
                                           const tempMsg = state.messages.find(m => m.tempId && m.content === parsed.content);
                                           if(tempMsg) {
                                               tempMsg.id = parsed.messageId;
                                               delete tempMsg.tempId;
                                               console.log("Updated user message ID:", parsed.messageId);
                                           }
                                      } else if (parsed.type === 'chunk' && parsed.content) {
                                         accumulatedRawContent += parsed.content;
                                         // Create message bubble if it doesn't exist yet
                                         if (!assistantMsg) {
                                              assistantMsg = { role: 'assistant', content: accumulatedRawContent, tempId: Date.now() + 1 };
                                              state.messages.push(assistantMsg);
                                              const messageElement = createMessageElement(assistantMsg);
                                              if (messageElement) {
                                                  messagesDiv.appendChild(messageElement);
                                                  contentDiv = messageElement.querySelector('.message-content');
                                              }
                                          } else {
                                              assistantMsg.content = accumulatedRawContent; // Update state object
                                          }
                                          // Update DOM directly for performance
                                          if (contentDiv) {
                                              renderMessageContent(contentDiv, assistantMsg); // Render markdown/code
                                              scrollToBottom(); // Scroll smoothly
                                          }
                                     } else if (parsed.type === 'final' && parsed.messageId) {
                                          // Backend confirms assistant message saved
                                          if (assistantMsg) {
                                              assistantMsg.id = parsed.messageId;
                                               assistantMsg.content = parsed.content; // Ensure final content matches DB
                                              delete assistantMsg.tempId;
                                               // Final render pass
                                               if (contentDiv) renderMessageContent(contentDiv, assistantMsg);
                                               console.log("Updated assistant message ID:", parsed.messageId);
                                          } else {
                                               // Assistant message arrived entirely in 'final' event (unlikely with chunks but possible)
                                               assistantMsg = { role: 'assistant', content: parsed.content, id: parsed.messageId };
                                               state.messages.push(assistantMsg);
                                               renderMessages(); // Full render if message didn't exist
                                               scrollToBottom(true);
                                          }
                                     } else if (parsed.type === 'titleUpdate' && parsed.convoId && parsed.newTitle) {
                                          // Handle title update
                                          updateConversationTitleInState(parsed.convoId, parsed.newTitle);
                                          renderConversations(); // Update sidebar
                                          // Update header if it's the current convo
                                          if (String(state.selectedConvoId) === String(parsed.convoId)) {
                                              updateConversationHeader(parsed.convoId);
                                          }
                                     } else if (parsed.type === 'error') {
                                         console.error("SSE Error Event:", parsed.message);
                                          if (assistantMsg && contentDiv) {
                                               assistantMsg.content += \`\n\n[Error: \${parsed.message}]\`;
                                               renderMessageContent(contentDiv, assistantMsg);
                                          } else {
                                               showAlert("Response Error", parsed.message || "An error occurred during the response.");
                                          }
                                     } else if (parsed.type === 'done') {
                                         console.log("SSE 'done' signal received.");
                                         // Break loop handled by reader.read() { done: true }
                                     }
                                 } catch (parseErr) {
                                     console.warn('Error parsing SSE data chunk:', dataString, parseErr);
                                 }
                             }
                         }
                     } // end for lines
                 } // end while true

             } catch (err) {
                 removeTypingIndicator();
                 setSendingState(false);
                 activeRequestController = null;

                 if (err.message === 'AbortError' || err.name === 'AbortError') {
                     console.log('Fetch request aborted.');
                      // Optionally add a "Cancelled" message to the UI
                      const lastMsg = state.messages[state.messages.length - 1];
                      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.tempId) {
                           lastMsg.content += "\\n\\n*(Request cancelled)*";
                           renderMessages(); // Re-render to show cancellation
                      } else if (!state.messages.some(m => m.role === 'assistant' && !m.tempId)) {
                           // If no assistant message was even started
                           // Maybe remove the user message? Or leave it.
                      }

                 } else {
                     console.error('Send message fetch/stream error:', err);
                     showAlert('Send Error', \`Error sending message: \${err.message}\`);
                     // Consider adding an error message to the chat UI
                 }
             }
        }

        // Helper to handle non-streamed JSON response from /send endpoint
         function handleNonStreamedResponse(data) {
             // Add assistant message
             if (data.response) {
                 state.messages.push({ role: 'assistant', content: data.response, id: data.assistantMessageId, created_at: new Date().toISOString() });
             }
             // Update user message ID if provided
             const userMsg = state.messages.find(m => m.tempId && m.content === messageInput.value /* Check against original input? Risky */);
             if (userMsg && data.userMessageId) {
                 userMsg.id = data.userMessageId;
                 delete userMsg.tempId;
             }
             renderMessages(); // Render updated messages
             scrollToBottom(true);

             // Handle title update if included
             if (data.newTitle && data.convoId) {
                 updateConversationTitleInState(data.convoId, data.newTitle);
                 renderConversations();
                 if (String(state.selectedConvoId) === String(data.convoId)) {
                     updateConversationHeader(data.convoId);
                 }
             }
         }


        function abortActiveRequest() {
            if (activeRequestController) {
                console.log("Aborting active request...");
                activeRequestController.abort();
                activeRequestController = null;
                // UI cleanup (typing indicator, button state) should happen in the error handler of the aborted request
                removeTypingIndicator(); // Explicitly remove here too
                 if(state.isSending) setSendingState(false);
            }
        }


        // --- Typing Indicator & Scrolling ---
        function showTypingIndicator() {
            if (typingIndicator) return;
            typingIndicator = createMessageElement({ role: 'assistant', content: '', isTyping: true }); // Use helper, add flag
            if (typingIndicator) { // createMessageElement can return null
                messagesDiv.appendChild(typingIndicator);
                scrollToBottom();
            }
        }

        function removeTypingIndicator() {
            if (typingIndicator) {
                typingIndicator.remove();
                typingIndicator = null;
            }
        }

        const debouncedScrollToBottom = debounce(scrollToBottom, 100); // Debounce smooth scroll

        function scrollToBottom(force = false) {
            // Use the correct container based on current view
            const currentContainer = (state.currentView === 'shared-conversation')
                ? $('.view-shared-conversation .messages-container')
                : messagesContainer;

            if (!currentContainer) return;

            const isNearBottom = currentContainer.scrollHeight - currentContainer.clientHeight <= currentContainer.scrollTop + 150; // Generous threshold

            if (force || isNearBottom) {
                // Use smooth scroll only if not forced, otherwise jump immediately
                currentContainer.scrollTo({
                    top: currentContainer.scrollHeight,
                    behavior: force ? 'auto' : 'smooth'
                });
            }
        }


        // --- Code Block & Copy Button Handling ---
        function addCopyButtonsToCodeBlocks(element) {
            element.querySelectorAll('pre').forEach((pre) => {
                if (pre.parentNode.classList.contains('code-block-wrapper')) return; // Skip if already wrapped

                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.title = 'Copy code';
                copyButton.onclick = () => { // Use onclick for simplicity here
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
                        // Maybe show temporary error state?
                    });
                };

                wrapper.appendChild(copyButton);
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
            });
        }

        // --- Conversation Management ---

        async function loadConversations() {
            if (!state.jwt) return;
            try {
                const response = await fetch('/convos', { headers: { 'Authorization': \`Bearer \${state.jwt}\` } });
                if (response.status === 401) throw new Error('Unauthorized');
                if (!response.ok) throw new Error('Failed to load');
                state.conversations = await response.json() || [];
                renderConversations();
            } catch (err) {
                console.error('Load conversations error:', err.message);
                 if (err.message === 'Unauthorized') triggerLogout(true);
                 else {
                      state.conversations = []; // Clear on other errors
                      renderConversations(); // Show empty/error state
                      // Optionally show error in sidebar:
                      // convoListDiv.innerHTML = '<p style="color:var(--danger-color); padding: 10px;">Error loading.</p>';
                 }
            }
        }

         function renderConversations() {
             convoListDiv.innerHTML = ''; // Clear previous list
             if (!state.conversations || state.conversations.length === 0) {
                 convoListDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 20px 0;">No conversations yet.</p>';
                 return;
             }

             // Sort by updated_at descending (already done by backend, but good practice)
             state.conversations.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

             state.conversations.forEach(convo => {
                 const div = document.createElement('div');
                 div.className = 'convo-item';
                 div.dataset.id = convo.id;

                 const titleSpan = document.createElement('span');
                 titleSpan.textContent = convo.title || 'Untitled';
                 titleSpan.title = convo.title || 'Untitled'; // Tooltip for long titles
                 div.appendChild(titleSpan);

                 const actionsDiv = document.createElement('div');
                 actionsDiv.className = 'convo-item-actions';

                 // Edit Button
                 const editButton = document.createElement('button');
                 editButton.className = 'edit-convo-btn';
                 editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                 editButton.title = 'Rename Conversation';
                 editButton.onclick = async (e) => {
                      e.stopPropagation(); // Prevent convo selection
                      handleRenameConversation(convo.id, convo.title);
                 };
                 actionsDiv.appendChild(editButton);


                 // Delete Button
                 const deleteButton = document.createElement('button');
                 deleteButton.className = 'delete-convo-btn';
                 deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                 deleteButton.title = 'Delete Conversation';
                 deleteButton.onclick = async (e) => {
                      e.stopPropagation(); // Prevent convo selection
                      handleDeleteConversation(convo.id, convo.title);
                 };
                 actionsDiv.appendChild(deleteButton);

                 div.appendChild(actionsDiv);

                 div.onclick = (e) => { // Use onclick for simplicity
                      // Navigate to conversation using hash change, which triggers handleHashChange
                      window.location.hash = \`#convo-\${convo.id}\`;
                 };

                 convoListDiv.appendChild(div);
             });
             highlightSelectedConvo(state.selectedConvoId); // Highlight after rendering
         }

        function highlightSelectedConvo(convoId) {
            $$('.convo-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.id === String(convoId));
            });
        }

         function updateConversationTitleInState(convoId, newTitle) {
             const convoIndex = state.conversations.findIndex(c => String(c.id) === String(convoId));
             if (convoIndex !== -1) {
                 state.conversations[convoIndex].title = newTitle;
                  state.conversations[convoIndex].updated_at = new Date().toISOString(); // Update timestamp locally
                 // Optionally re-sort state.conversations here if strict order is needed immediately
             }
         }

         // --- Conversation Actions Handlers ---

         async function handleCreateConversation() {
             const button = $('#create-convo');
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

             try {
                 const response = await fetch('/convo', {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json',
                         'Authorization': \`Bearer \${state.jwt}\`,
                     }
                     // No body needed, backend sets default title
                 });
                  if (response.status === 401) throw new Error('Unauthorized');
                 if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || 'Failed to create conversation.');
                 }

                 const newConvo = await response.json();
                 state.conversations.unshift(newConvo); // Add to beginning
                 state.selectedConvoId = newConvo.id;
                 state.messages = []; // Clear messages for new convo

                 renderConversations(); // Update sidebar
                 // Set view *without* loading messages (it's new/empty)
                 setView('conversation', { convoId: newConvo.id });
                 renderMessages(); // Ensure messages area is cleared/shows placeholder


             } catch (err) {
                 console.error('Create convo error:', err);
                  if (err.message === 'Unauthorized') triggerLogout(true);
                  else await showAlert('Error', err.message || 'An error occurred while creating the conversation.');
             } finally {
                  button.disabled = false;
                  button.innerHTML = '<i class="fas fa-plus"></i> New Chat';
             }
         }

          async function handleRenameConversation(convoId, currentTitle) {
              const newTitle = await showPrompt('Rename Conversation', 'Enter a new title:', { value: currentTitle });

              if (newTitle === null || newTitle.trim() === '' || newTitle.trim() === currentTitle) {
                   console.log("Rename cancelled or title unchanged.");
                   return; // User cancelled or entered empty/same title
              }

              const trimmedTitle = newTitle.trim();

               // Optimistic UI update (optional, can make UI feel faster)
               // const itemSpan = $(\`.convo-item[data-id="\${convoId}"] span\`);
               // if (itemSpan) itemSpan.textContent = trimmedTitle + ' (saving...)';

              try {
                  const response = await fetch(\`/convo/\${convoId}\`, {
                      method: 'PUT',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': \`Bearer \${state.jwt}\`,
                      },
                      body: JSON.stringify({ title: trimmedTitle }),
                  });
                  if (response.status === 401) throw new Error('Unauthorized');
                   if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to rename conversation.');
                   }
                   const result = await response.json();

                   // Update state and re-render
                   updateConversationTitleInState(convoId, trimmedTitle);
                   // Update updated_at from server response if available
                   if (result.conversation?.updated_at) {
                        const convoIndex = state.conversations.findIndex(c => String(c.id) === String(convoId));
                         if (convoIndex !== -1) state.conversations[convoIndex].updated_at = result.conversation.updated_at;
                   }
                   renderConversations(); // Re-render list (might re-sort)
                    if (String(state.selectedConvoId) === String(convoId)) {
                       updateConversationHeader(convoId); // Update header title if current
                   }

              } catch (err) {
                   console.error('Rename convo error:', err);
                    // Revert optimistic update if it was used
                    // if (itemSpan) itemSpan.textContent = currentTitle;
                   if (err.message === 'Unauthorized') triggerLogout(true);
                   else await showAlert('Error', err.message || 'An error occurred while renaming.');
              }
          }

        async function handleDeleteConversation(convoId, convoTitle) {
            const confirmed = await showConfirm(
                'Delete Conversation?',
                \`Are you sure you want to permanently delete "\${convoTitle || 'Untitled'}"?\`
            );
            if (!confirmed) return;

             // Visually indicate deleting (optional)
             const itemDiv = $(\`.convo-item[data-id="\${convoId}"]\`);
             if (itemDiv) itemDiv.style.opacity = '0.5';

            try {
                const response = await fetch(\`/convo/\${convoId}\`, {
                    method: 'DELETE',
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                });
                 if (response.status === 401) throw new Error('Unauthorized');
                if (!response.ok) {
                     const errorData = await response.json().catch(() => ({}));
                     throw new Error(errorData.message || 'Failed to delete conversation.');
                }

                // Remove from state and UI
                state.conversations = state.conversations.filter(c => String(c.id) !== String(convoId));
                renderConversations(); // Re-render sidebar

                // If the deleted convo was selected, go to dashboard
                if (String(state.selectedConvoId) === String(convoId)) {
                    state.selectedConvoId = null;
                    state.messages = [];
                    setView('dashboard'); // setView clears messages UI internally
                }
            } catch (err) {
                console.error('Delete convo error:', err);
                 if (itemDiv) itemDiv.style.opacity = '1'; // Revert visual indication on error
                if (err.message === 'Unauthorized') triggerLogout(true);
                else await showAlert('Error', err.message || 'An error occurred while deleting.');
            }
        }

         async function handleClearAllConversations() {
             const confirmed = await showConfirm(
                 'Delete All Conversations?',
                 'Are you sure you want to delete ALL your conversations? This action cannot be undone.'
             );
             if (!confirmed) return;

             const button = $('#clear-all');
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';

             try {
                 const response = await fetch('/convo/all', {
                     method: 'DELETE',
                     headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                 });
                  if (response.status === 401) throw new Error('Unauthorized');
                 if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || 'Failed to clear conversations.');
                 }

                 state.conversations = [];
                 state.selectedConvoId = null;
                 state.messages = [];
                 renderConversations();
                 setView('dashboard'); // setView clears messages UI internally

             } catch (err) {
                 console.error('Clear all convos error:', err);
                  if (err.message === 'Unauthorized') triggerLogout(true);
                  else await showAlert('Error', err.message || 'An error occurred while clearing conversations.');
             } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All';
             }
         }

         // Add handlers for conversation header buttons
         $('#rename-convo-button')?.addEventListener('click', () => {
              if (state.selectedConvoId) {
                  const convo = state.conversations.find(c => String(c.id) === state.selectedConvoId);
                   if (convo) handleRenameConversation(convo.id, convo.title);
              }
         });
         $('#delete-convo-button')?.addEventListener('click', () => {
              if (state.selectedConvoId) {
                  const convo = state.conversations.find(c => String(c.id) === state.selectedConvoId);
                   if (convo) handleDeleteConversation(convo.id, convo.title);
              }
         });


        // --- Message Loading & Rendering ---

        async function loadMessages(convoId) {
            if (!state.jwt || !convoId) return;
            // *** FIX: Removed guard clause: 'if (state.currentView !== 'conversation') return;' ***
            // View is now set *before* this is called in handleHashChange

            // Abort previous requests and clear existing messages/indicators
             abortActiveRequest();
             closeSseConnection(); // Ensure SSE is closed before loading history
             messagesDiv.innerHTML = '<div style="text-align: center; margin-top: 50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color: var(--text-muted);"></i><p style="color: var(--text-muted);">Loading messages...</p></div>';
             state.messages = []; // Clear state messages

             try {
                const response = await fetch(\`/convo/\${convoId}\`, {
                    headers: { 'Authorization': \`Bearer \${state.jwt}\` },
                });
                if (response.status === 401) throw new Error('Unauthorized');
                 if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || \`Failed to load messages (\${response.status})\`);
                 }

                state.messages = await response.json() || [];
                renderMessages();
                // Scroll to bottom after initial load
                setTimeout(() => scrollToBottom(true), 50);

            } catch (err) {
                console.error('Load messages error:', err);
                 messagesDiv.innerHTML = \`<p style="text-align: center; color: var(--danger-color);">Error: \${err.message}</p>\`;
                 state.messages = []; // Ensure state is clear on error
                 if (err.message === 'Unauthorized') triggerLogout(true);
            }
        }

        // Helper to create message DOM element
        function createMessageElement(msg) {
            if (!msg || !msg.role || typeof msg.content === 'undefined') {
                console.warn("Skipping invalid message object:", msg);
                return null;
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.dataset.role = msg.role;
            if (msg.id) messageDiv.dataset.messageId = msg.id;
            if (msg.tempId) messageDiv.dataset.tempId = msg.tempId;


            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            avatarDiv.innerHTML = msg.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';

             // Add typing indicator structure if needed
            if (msg.isTyping) {
                 const typingDiv = document.createElement('div');
                 typingDiv.className = 'typing-indicator';
                 typingDiv.innerHTML = '<span></span><span></span><span></span>';
                 bubbleDiv.appendChild(typingDiv);
                 messageDiv.id = 'typing-indicator-message'; // ID for easy removal
                 messageDiv.appendChild(avatarDiv);
                 messageDiv.appendChild(bubbleDiv);
                 return messageDiv;
            }

            // Regular message structure
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';

            const roleSpan = document.createElement('span');
            roleSpan.className = 'role';
            roleSpan.textContent = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
            headerDiv.appendChild(roleSpan);

            // Message Copy Button (Assistant only)
            if (msg.role === 'assistant' && msg.content?.trim()) {
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.title = 'Copy message';
                copyButton.onclick = () => { // Use onclick for simplicity
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
                        showAlert('Copy Failed', 'Could not copy message to clipboard.');
                    });
                };
                headerDiv.appendChild(copyButton);
            }

            bubbleDiv.appendChild(headerDiv);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            renderMessageContent(contentDiv, msg); // Use helper to render content
            bubbleDiv.appendChild(contentDiv);

            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);
            return messageDiv;
        }

         // Helper function to render content (Markdown, Highlight, Copy buttons)
         function renderMessageContent(contentDivElement, message) {
             if (!contentDivElement || !message) return;

             if (message.role === 'assistant') {
                 // Sanitize BEFORE converting to HTML if using Showdown
                 // const sanitizedContent = message.content || ''; // Basic sanitization might be needed depending on trust level
                 const rawHtml = showdownConverter.makeHtml(message.content || '');
                 contentDivElement.innerHTML = rawHtml;
                 // Apply highlighting and add code block copy buttons AFTER setting innerHTML
                 try {
                     contentDivElement.querySelectorAll('pre code').forEach(block => {
                          // Check if already highlighted
                          if (!block.classList.contains('hljs')) {
                              hljs.highlightElement(block);
                          }
                     });
                 } catch (e) { console.error("Highlight.js error:", e); }
                 addCopyButtonsToCodeBlocks(contentDivElement); // Handles adding wrapper and button
             } else {
                 // For user messages, just set text content for safety
                 contentDivElement.textContent = message.content || '';
             }
         }

        function renderMessages(targetDiv = messagesDiv) {
            // Ensure targetDiv exists (could be null if called before DOM ready in edge cases)
            if (!targetDiv) {
                 console.warn("renderMessages called with null targetDiv");
                 return;
            }
            targetDiv.innerHTML = ''; // Clear previous messages

             const messagesToRender = (targetDiv === sharedMessagesDiv && state.sharedConvoData)
                 ? state.sharedConvoData.messages
                 : state.messages;

             if (!messagesToRender || messagesToRender.length === 0) {
                 if (state.currentView === 'conversation' && targetDiv === messagesDiv) {
                     targetDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 30px;">Send a message to start the conversation.</p>';
                 } else if (state.currentView === 'shared-conversation' && targetDiv === sharedMessagesDiv) {
                      targetDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 30px;">This shared conversation has no messages.</p>';
                 }
                 return;
             }

             messagesToRender.forEach(msg => {
                 const messageElement = createMessageElement(msg);
                 if (messageElement) {
                     targetDiv.appendChild(messageElement);
                 }
             });
             // Scrolling handled by callers (loadMessages, send handler, stream handler)
        }

         function updateConversationHeader(convoId) {
             if (!conversationTitleH2) return;
             const convo = state.conversations.find(c => String(c.id) === String(convoId));
             conversationTitleH2.textContent = convo ? convo.title : 'Conversation';
             conversationTitleH2.title = convo ? convo.title : 'Conversation'; // Tooltip
         }


         // --- Sharing ---

         async function handleShareConversation() {
             if (!state.selectedConvoId) return;

             const button = $('#share-convo-button');
             const originalHtml = button.innerHTML;
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sharing...';

             try {
                 const response = await fetch(\`/convo/\${state.selectedConvoId}/share\`, {
                     method: 'POST',
                     headers: { 'Authorization': \`Bearer \${state.jwt}\` }
                 });
                  if (response.status === 401) throw new Error('Unauthorized');
                  if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || 'Failed to generate share link.');
                  }
                  const data = await response.json();
                  const shareLink = \`\${window.location.origin}\${window.location.pathname}#share-\${data.shareToken}\`;

                  // Update state (optional, if needed elsewhere)
                   const convoIndex = state.conversations.findIndex(c => String(c.id) === state.selectedConvoId);
                   if (convoIndex !== -1) {
                        state.conversations[convoIndex].share_token = data.shareToken;
                        state.conversations[convoIndex].shared_at = data.sharedAt;
                   }

                  // Show modal with link and copy button
                  const modalResult = await showModal({
                       title: 'Share Conversation',
                       message: \`Anyone with this link can view a snapshot of this conversation (up to the time of sharing).<br><br><input type="text" class="modal-input" value="\${shareLink}" readonly onclick="this.select()">\`,
                       buttons: [
                           { text: 'Copy Link', type: 'primary', value: 'copy' }, // Use value to differentiate actions
                           { text: 'Revoke Share', type: 'danger', value: 'revoke' },
                           { text: 'Close', type: 'secondary', value: false }
                       ]
                   });

                   if (modalResult.confirmed && modalResult.value === 'copy') { // Check specific value
                       navigator.clipboard.writeText(shareLink).then(() => {
                           showAlert('Copied!', 'Share link copied to clipboard.');
                       }).catch(err => {
                           console.error("Copy failed:", err);
                           showAlert('Copy Failed', 'Could not copy link. You can copy it manually.');
                       });
                   } else if (modalResult.confirmed && modalResult.value === 'revoke') { // Check specific value
                        handleRevokeShare();
                   }
                   // 'Close' or clicking outside resolves { confirmed: false } and does nothing here

             } catch (err) {
                 console.error("Share error:", err);
                  if (err.message === 'Unauthorized') triggerLogout(true);
                  else await showAlert('Share Error', err.message || 'Could not generate share link.');
             } finally {
                 button.disabled = false;
                 button.innerHTML = originalHtml;
             }
         }

         async function handleRevokeShare() {
             if (!state.selectedConvoId) return;
             // Confirmation is now done inside handleShareConversation flow or can be added here if called directly
             // const confirmed = await showConfirm('Revoke Share?', 'Are you sure? This will invalidate the current share link.');
             // if (!confirmed) return;

             try {
                 const response = await fetch(\`/convo/\${state.selectedConvoId}/share\`, {
                     method: 'DELETE',
                     headers: { 'Authorization': \`Bearer \${state.jwt}\` }
                 });
                 if (response.status === 401) throw new Error('Unauthorized');
                 if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || 'Failed to revoke share link.');
                 }

                  // Update state
                   const convoIndex = state.conversations.findIndex(c => String(c.id) === state.selectedConvoId);
                   if (convoIndex !== -1) {
                        state.conversations[convoIndex].share_token = null;
                        state.conversations[convoIndex].shared_at = null;
                   }
                  await showAlert('Sharing Revoked', 'The share link has been invalidated.');

             } catch (err) {
                  console.error("Revoke share error:", err);
                  if (err.message === 'Unauthorized') triggerLogout(true);
                  else await showAlert('Error', err.message || 'Could not revoke share link.');
             }
         }

         $('#share-convo-button')?.addEventListener('click', handleShareConversation);

         async function loadSharedConversation(token) {
             setLoadingState(true);
             state.sharedConvoData = null; // Clear previous shared data
             renderMessages(sharedMessagesDiv); // Clear UI
             sharedConversationTitleH2.textContent = 'Loading Shared Chat...';

             try {
                 const response = await fetch(\`/share/\${token}\`);
                  if (!response.ok) {
                      let errorMsg = 'Failed to load shared conversation.';
                      if (response.status === 404) errorMsg = 'Shared conversation not found or the link is invalid/revoked.';
                      else {
                           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch {}
                      }
                      throw new Error(errorMsg);
                  }

                 state.sharedConvoData = await response.json();
                 sharedConversationTitleH2.textContent = state.sharedConvoData.title || 'Shared Conversation';
                 sharedConversationTitleH2.title = state.sharedConvoData.title || 'Shared Conversation';
                 renderMessages(sharedMessagesDiv); // Render into the dedicated shared div
                 setView('shared-conversation', { token }); // Set the view last
                 // Scroll to bottom after loading shared messages
                 setTimeout(() => scrollToBottom(true), 50);


             } catch (err) {
                 console.error("Load shared convo error:", err);
                 await showAlert('Error Loading Shared Chat', err.message);
                 // Redirect to login/dashboard after showing error
                 state.sharedConvoData = null;
                 setView(state.jwt ? 'dashboard' : 'login');
             } finally {
                 setLoadingState(false);
             }
         }


        // --- Event Listeners ---

        // Auth Forms
        $('#login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = $('#login-email').value;
            const password = $('#login-password').value;
            const button = e.target.querySelector('button');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                const response = await fetch('/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Login failed.');

                state.jwt = data.token;
                localStorage.setItem('jwt', data.token);
                await fetchUserInfo(); // Fetch user details AFTER getting token
                await loadConversations();
                // Navigate via hash change to load messages correctly if needed
                window.location.hash = '#dashboard';

            } catch (err) {
                console.error('Login error:', err);
                await showAlert('Login Failed', err.message);
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });

        $('#register-form')?.addEventListener('submit', async (e) => {
             e.preventDefault();
             const email = $('#register-email').value;
             const password = $('#register-password').value;
             const confirmPassword = $('#register-confirm-password').value;
             const button = e.target.querySelector('button');

              if (password !== confirmPassword) {
                  showAlert('Error', 'Passwords do not match.');
                  return;
              }

             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

             try {
                 const response = await fetch('/register', {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email, password, confirmPassword }),
                 });
                 const data = await response.json();
                  if (!response.ok) throw new Error(data.message || 'Registration failed.');

                 await showAlert('Registration Successful', 'Please check your email for the verification code.');
                 $('#verify-email').value = email; // Pre-fill email for verification
                 setView('verify');

             } catch (err) {
                 console.error('Register error:', err);
                 await showAlert('Registration Failed', err.message);
             } finally {
                  button.disabled = false;
                  button.innerHTML = '<i class="fas fa-user-plus"></i> Register';
             }
         });

         $('#verify-form')?.addEventListener('submit', async (e) => {
             e.preventDefault();
             const email = $('#verify-email').value;
             const code = $('#verify-code').value.toUpperCase(); // Ensure uppercase
             const button = e.target.querySelector('button');
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

             try {
                 const response = await fetch('/verify', {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email, code }),
                 });
                 const data = await response.json();
                 if (!response.ok) throw new Error(data.message || 'Verification failed.');

                 await showAlert('Success!', 'Email verified successfully! You can now log in.');
                 $('#login-email').value = email; // Pre-fill login email
                 setView('login');

             } catch (err) {
                 console.error('Verify error:', err);
                 await showAlert('Verification Failed', err.message);
             } finally {
                  button.disabled = false;
                  button.innerHTML = '<i class="fas fa-check-circle"></i> Verify';
             }
         });

         $('#resend-code')?.addEventListener('click', async (e) => {
             const email = $('#verify-email').value;
              if (!email) {
                  showAlert("Missing Email", "Please ensure the email field contains your email address.");
                  return;
              }
              const button = e.target.closest('button'); // Ensure we target the button itself
              if (!button) return;

              button.disabled = true;
              let originalHtml = button.innerHTML; // Store original HTML
              button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';

             try {
                 const response = await fetch('/resend-verification', {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email }),
                 });
                 const data = await response.json();
                  if (!response.ok) throw new Error(data.message || 'Failed to resend code.');

                 await showAlert('Code Sent', 'Verification code resent. Please check your email.');
                  // Add cooldown visual state
                  button.innerHTML = '<i class="fas fa-clock"></i> Wait...';
                  setTimeout(() => { button.disabled = false; button.innerHTML = originalHtml; }, 45000); // 45s cooldown

             } catch (err) {
                 console.error('Resend code error:', err);
                 await showAlert('Error', err.message || 'An error occurred while resending the code.');
                  button.disabled = false; // Re-enable immediately on error
                 button.innerHTML = originalHtml;
             }
         });

         $('#forgot-password-form')?.addEventListener('submit', async (e) => {
             e.preventDefault();
             const email = $('#forgot-email').value;
             const button = e.target.querySelector('button');
             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

             try {
                 // Backend handles checking if user exists and sending email
                 const response = await fetch('/request-password-reset', {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email }),
                 });
                  const data = await response.json(); // Backend always returns generic success
                  if (!response.ok) {
                       // Log internal error but show generic message
                       console.error("Internal error during password reset request:", data.message);
                  }

                 await showAlert('Check Your Email', data.message || 'If an account exists, a reset link has been sent.');
                  // Optionally clear field or redirect
                  $('#forgot-email').value = '';
                  // setView('login'); // Or stay on the page

             } catch (err) {
                 // Network or other unexpected errors
                 console.error('Request password reset error:', err);
                 await showAlert('Error', 'An unexpected error occurred. Please try again later.');
             } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
             }
         });

         $('#reset-password-form')?.addEventListener('submit', async (e) => {
             e.preventDefault();
             const token = $('#reset-token').value;
             const newPassword = $('#reset-new-password').value;
             const confirmNewPassword = $('#reset-confirm-password').value;
             const button = e.target.querySelector('button');

             if (!token) {
                 showAlert('Error', 'Invalid reset link. Please request a new one.');
                 setView('forgot-password');
                 return;
             }
             if (newPassword !== confirmNewPassword) {
                 showAlert('Error', 'Passwords do not match.');
                 return;
             }

             button.disabled = true;
             button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

             try {
                 const response = await fetch('/reset-password', {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ token, newPassword, confirmNewPassword }),
                 });
                 const data = await response.json();
                 if (!response.ok) throw new Error(data.message || 'Password reset failed.');

                 await showAlert('Success!', 'Password reset successfully. You can now log in.');
                 setView('login');

             } catch (err) {
                 console.error('Reset password error:', err);
                 await showAlert('Password Reset Failed', err.message);
             } finally {
                 button.disabled = false;
                 button.innerHTML = '<i class="fas fa-save"></i> Set New Password';
             }
         });


        // Navigation Links
        $$('#to-register, #to-login, #to-forgot-password, #back-to-login-verify, #back-to-login-forgot, #back-to-login-reset').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetHash = e.target.closest('a')?.getAttribute('href'); // Get href like #login
                if (targetHash) window.location.hash = targetHash; // Navigate via hash change
            });
        });

        // Logout Listener (Sidebar only)
        sidebarLogoutButton?.addEventListener('click', () => triggerLogout());

        // Mobile Sidebar Toggle
        $('#menu-toggle')?.addEventListener('click', () => {
            sidebar.classList.add('open');
            backdrop.classList.add('open');
        });
        $('#close-sidebar')?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
        });
        backdrop?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
        });

         // Conversation Creation/Deletion
         $('#create-convo')?.addEventListener('click', handleCreateConversation);
         $('#clear-all')?.addEventListener('click', handleClearAllConversations);


        // Message Input & Sending
        messageInput?.addEventListener('input', adjustTextareaHeight);
        messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline
                if (!state.isSending) { // Only submit if not already sending
                     $('#send-form').requestSubmit();
                }
            }
        });

        $('#send-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (state.isSending) return; // Prevent double send

            const messageContent = messageInput.value.trim();
            if (!messageContent || !state.selectedConvoId) return;

            // Use the revised streaming fetch approach
             streamFetchResponse(state.selectedConvoId, messageContent);
             // setSendingState(true) and clearing input is handled within streamFetchResponse
        });

        // --- Initialization ---
        window.addEventListener('load', async () => {
            setLoadingState(true);
            const savedJwt = localStorage.getItem('jwt');
            if (savedJwt) {
                state.jwt = savedJwt;
                 // Fetch user info and conversations *concurrently*
                await Promise.all([
                    fetchUserInfo(),
                    loadConversations()
                ]);
                 // Only proceed to handle hash if token was *not* invalidated by fetchUserInfo
                 if (state.jwt) {
                     await handleHashChange(); // Determine view based on hash/state (will now load messages if #convo)
                 } else {
                     // fetchUserInfo triggered logout
                     setView('login');
                 }
            } else {
                // No token, handle hash (will default to login/register etc.)
                await handleHashChange();
            }
            adjustTextareaHeight(); // Initial adjustment
            setLoadingState(false);
        });

        // Handle URL hash changes for navigation
        window.addEventListener('hashchange', handleHashChange);

    </script>
</body>
</html>
`;
