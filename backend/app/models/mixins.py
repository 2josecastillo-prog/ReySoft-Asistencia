from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.utils.names import apply_full_name_to_instance, compose_full_name


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PersonNameMixin:
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    second_surname: Mapped[str | None] = mapped_column(String(80), nullable=True)

    @property
    def full_name(self) -> str:
        return compose_full_name(self.first_name, self.middle_name, self.last_name, self.second_surname)

    @full_name.setter
    def full_name(self, value: str) -> None:
        apply_full_name_to_instance(self, value)
