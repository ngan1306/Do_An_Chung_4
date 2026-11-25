-- Chạy bằng Windows Authentication trên .\SQLEXPRESS.
IF DB_ID(N'SmartHome') IS NULL
    CREATE DATABASE SmartHome;
GO

USE SmartHome;


GO
IF OBJECT_ID('dbo.telemetry_history', 'U') IS NULL
    CREATE TABLE dbo.telemetry_history (
        id          INT       IDENTITY (1, 1) PRIMARY KEY,
        temperature FLOAT     NOT NULL,
        humidity    FLOAT     NOT NULL,
        smoke       FLOAT     DEFAULT 0 NOT NULL,
        motion      BIT       DEFAULT 0 NOT NULL,
        received_at DATETIME2 DEFAULT SYSUTCDATETIME() NOT NULL
    );


GO
IF OBJECT_ID('dbo.device_state', 'U') IS NULL
    CREATE TABLE dbo.device_state (
        device_id  VARCHAR (50) PRIMARY KEY,
        state      VARCHAR (10) DEFAULT 'OFF' NOT NULL,
        updated_at DATETIME2    DEFAULT SYSUTCDATETIME() NOT NULL
    );


GO
IF OBJECT_ID('dbo.schedules', 'U') IS NULL
    CREATE TABLE dbo.schedules (
        id         VARCHAR (60) PRIMARY KEY,
        device_id  VARCHAR (50) NOT NULL,
        time       VARCHAR (5)  NOT NULL,
        action     VARCHAR (5)  NOT NULL,
        weekdays   VARCHAR (20) DEFAULT '0,1,2,3,4,5,6' NOT NULL,
        enabled    BIT          DEFAULT 1 NOT NULL,
        created_at DATETIME2    DEFAULT SYSUTCDATETIME() NOT NULL
    );


GO
IF OBJECT_ID('dbo.settings', 'U') IS NULL
    CREATE TABLE dbo.settings (
        id               INT          DEFAULT 1 PRIMARY KEY,
        theme            VARCHAR (10) DEFAULT 'dark' NOT NULL,
        temperature_high FLOAT        DEFAULT 35 NOT NULL,
        humidity_high    FLOAT        DEFAULT 80 NOT NULL,
        smoke_high       FLOAT        DEFAULT 300 NOT NULL,
        CHECK (id = 1)
    );


GO
IF NOT EXISTS (SELECT 1
               FROM   dbo.settings
               WHERE  id = 1)
    INSERT  INTO dbo.settings (
        id
    )
    VALUES                    (1);


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
