USE SmartHome;
GO

IF OBJECT_ID('dbo.auth_users', 'U') IS NULL
    CREATE TABLE dbo.auth_users (
        id            INT IDENTITY (1, 1) PRIMARY KEY,
        display_name  NVARCHAR (80)  NOT NULL,
        email         NVARCHAR (254) NOT NULL,
        password_salt CHAR (32)      NOT NULL,
        password_hash CHAR (128)     NOT NULL,
        created_at    DATETIME2      DEFAULT SYSUTCDATETIME() NOT NULL,
        CONSTRAINT UQ_auth_users_email UNIQUE (email)
    );
GO

IF OBJECT_ID('dbo.auth_sessions', 'U') IS NULL
    CREATE TABLE dbo.auth_sessions (
        token_hash CHAR (64) PRIMARY KEY,
        user_id    INT       NOT NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME() NOT NULL,
        expires_at DATETIME2 NOT NULL,
        CONSTRAINT FK_auth_sessions_user FOREIGN KEY (user_id)
            REFERENCES dbo.auth_users (id) ON DELETE CASCADE
    );
GO
