from typing import Callable, TypeVar

from sqlalchemy import Select, BaseRow, func
from sqlalchemy.orm import Session

from server.models import PaginatedResponse

T = TypeVar('T')


def paginate(
        session: Session,
        query: Select,
        conv: Callable[[BaseRow], T],
        *,
        page=1, page_size=10,
) -> PaginatedResponse:
    count = session.execute(
        query.order_by(None).group_by(None).with_only_columns(func.count())
    ).scalar_one()
    results = session.execute(
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return PaginatedResponse(
        data=[conv(row) for row in results],
        total_count=count,
        page=page,
        next_page=page + 1 if page * page_size < count else None
    )
