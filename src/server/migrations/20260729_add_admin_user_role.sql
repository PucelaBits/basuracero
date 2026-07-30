ALTER TABLE admin_users
ADD COLUMN role TEXT NOT NULL DEFAULT 'administrator' CHECK (role IN ('administrator', 'moderator'));
