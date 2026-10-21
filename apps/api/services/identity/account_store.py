"""The SQLAlchemy :class:`~engine.identity.accounts.AccountStore`."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from database.models import EmailToken, RefreshToken, User


class SqlAccountStore:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def by_apple_subject(self, subject: str) -> User | None:
        return self.db.scalar(select(User).where(User.apple_user_id == subject))

    def get(self, account_id: str) -> User | None:
        return self.db.get(User, account_id)

    def add_account(self, *, email: str, password_hash: str, is_verified: bool = False,
                    apple_user_id: str | None = None) -> User:
        user = User(email=email, password_hash=password_hash, is_verified=is_verified)
        if apple_user_id is not None:
            user.apple_user_id = apple_user_id
        self.db.add(user)
        return user

    def remove_account(self, account: User) -> None:
        self.db.delete(account)

    def add_session(self, account_id: str, token_hash: str, expires_at: datetime) -> None:
        self.db.add(RefreshToken(user_id=account_id, token_hash=token_hash, expires_at=expires_at))

    def session(self, token_hash: str) -> RefreshToken | None:
        return self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    def live_sessions(self, account_id: str) -> list[RefreshToken]:
        return list(self.db.scalars(
            select(RefreshToken).where(RefreshToken.user_id == account_id, RefreshToken.revoked_at.is_(None))
        ))

    def add_email_link(self, account_id: str, kind: str, token_hash: str, expires_at: datetime) -> None:
        self.db.add(EmailToken(user_id=account_id, kind=kind, token_hash=token_hash, expires_at=expires_at))

    def email_link(self, token_hash: str, kind: str) -> EmailToken | None:
        return self.db.scalar(
            select(EmailToken).where(EmailToken.token_hash == token_hash, EmailToken.kind == kind)
        )

    def commit(self, refresh: User | None = None) -> None:
        self.db.commit()
        if refresh is not None:
            self.db.refresh(refresh)
