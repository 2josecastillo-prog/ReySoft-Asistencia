from pydantic import BaseModel, Field


class FrontendErrorReport(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    name: str | None = Field(default=None, max_length=120)
    stack: str | None = Field(default=None, max_length=3000)
    path: str | None = Field(default=None, max_length=500)
    source: str | None = Field(default=None, max_length=500)
    line: int | None = Field(default=None, ge=0)
    column: int | None = Field(default=None, ge=0)
    user_agent: str | None = Field(default=None, max_length=500)
    release: str | None = Field(default=None, max_length=120)
