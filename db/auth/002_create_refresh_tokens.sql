USE uhg;
GO

IF OBJECT_ID(N'dbo.refresh_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    jti         NVARCHAR(100)    NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    expires_at  DATETIME2        NOT NULL,
    revoked_at  DATETIME2        NULL,
    created_at  DATETIME2        NOT NULL CONSTRAINT DF_rt_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_refresh_tokens_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX UX_refresh_tokens_jti ON dbo.refresh_tokens(jti);
END
GO
