USE uhg;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    email         NVARCHAR(255)    NOT NULL,
    password_hash NVARCHAR(255)    NOT NULL,
    first_name    NVARCHAR(100)    NOT NULL,
    last_name     NVARCHAR(100)    NOT NULL,
    role          NVARCHAR(50)     NOT NULL CONSTRAINT DF_users_role DEFAULT (N'USER'),
    is_active     BIT              NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    last_login_at DATETIME2        NULL,
    created_at    DATETIME2        NOT NULL CONSTRAINT DF_users_created DEFAULT (SYSUTCDATETIME()),
    updated_at    DATETIME2        NOT NULL CONSTRAINT DF_users_updated DEFAULT (SYSUTCDATETIME())
  );

  CREATE UNIQUE INDEX UX_users_email ON dbo.users(email);
END
GO
