from dataclasses import dataclass


@dataclass(frozen=True)
class CauseCodeInfo:
    code: int
    name: str
    description: str
    category: str  # "normal" | "busy" | "no_answer" | "rejected" | "failed"


# Standard Q.850 + Cisco CUCM specific cause codes
CAUSE_CODES: dict[int, CauseCodeInfo] = {
    0: CauseCodeInfo(0, "No Cause", "Причина не указана", "normal"),
    1: CauseCodeInfo(1, "Unallocated Number", "Несуществующий / неназначенный номер", "failed"),
    2: CauseCodeInfo(2, "No Route to Network", "Нет маршрута к указанной сети", "failed"),
    3: CauseCodeInfo(3, "No Route to Destination", "Нет маршрута к адресату", "failed"),
    16: CauseCodeInfo(16, "Normal Call Clearing", "Нормальное завершение вызова", "normal"),
    17: CauseCodeInfo(17, "User Busy", "Абонент занят", "busy"),
    18: CauseCodeInfo(18, "No User Responding", "Нет ответа от терминала (таймаут)", "no_answer"),
    19: CauseCodeInfo(19, "No Answer", "Абонент не отвечает", "no_answer"),
    20: CauseCodeInfo(20, "Subscriber Absent", "Абонент недоступен", "no_answer"),
    21: CauseCodeInfo(21, "Call Rejected", "Вызов отклонён", "rejected"),
    22: CauseCodeInfo(22, "Number Changed", "Номер изменён", "failed"),
    27: CauseCodeInfo(27, "Destination Out of Order", "Направление неисправно", "failed"),
    28: CauseCodeInfo(28, "Invalid Number Format", "Неверный формат номера", "failed"),
    29: CauseCodeInfo(29, "Facility Rejected", "Услуга отклонена", "rejected"),
    31: CauseCodeInfo(31, "Normal, Unspecified", "Нормальное завершение (без уточнения)", "normal"),
    34: CauseCodeInfo(34, "No Circuit/Channel Available", "Нет доступных каналов / линий", "failed"),
    38: CauseCodeInfo(38, "Network Out of Order", "Сеть не работает", "failed"),
    41: CauseCodeInfo(41, "Temporary Failure", "Временный сбой", "failed"),
    42: CauseCodeInfo(42, "Switching Equipment Congestion", "Перегрузка оборудования", "failed"),
    44: CauseCodeInfo(44, "Requested Channel Not Available", "Запрошенный канал недоступен", "failed"),
    47: CauseCodeInfo(47, "Resource Unavailable", "Ресурс недоступен", "failed"),
    50: CauseCodeInfo(50, "Facility Not Subscribed", "Услуга не подключена", "rejected"),
    57: CauseCodeInfo(57, "Bearer Capability Not Authorized", "Нет прав на тип вызова", "rejected"),
    58: CauseCodeInfo(58, "Bearer Capability Not Available", "Тип вызова недоступен", "failed"),
    63: CauseCodeInfo(63, "Service Not Available", "Сервис недоступен", "failed"),
    65: CauseCodeInfo(65, "Bearer Capability Not Implemented", "Неподдерживаемый тип вызова", "failed"),
    88: CauseCodeInfo(88, "Incompatible Destination", "Несовместимый адресат / кодек", "failed"),
    96: CauseCodeInfo(96, "Mandatory IE Missing", "Отсутствует обязательный элемент", "failed"),
    102: CauseCodeInfo(102, "Recovery on Timer Expiry", "Истечение таймера протокола", "failed"),
    111: CauseCodeInfo(111, "Protocol Error", "Ошибка протокола", "failed"),
    127: CauseCodeInfo(127, "Interworking, Unspecified", "Ошибка взаимодействия шлюзов", "failed"),
    # Cisco CUCM extended cause codes
    129: CauseCodeInfo(129, "Precedence Level Exceeded", "Превышен уровень приоритета", "rejected"),
    262144: CauseCodeInfo(262144, "Call Split (Transfer/Hold)", "Разделение вызова (перевод/удержание)", "normal"),
    393216: CauseCodeInfo(393216, "Call Split", "Вызов разделён (Call Split)", "normal"),
    458752: CauseCodeInfo(458752, "Conference", "Конференция", "normal"),
    524288: CauseCodeInfo(524288, "Call Park", "Парковка вызова", "normal"),
    655360: CauseCodeInfo(655360, "Call Pickup", "Перехват вызова", "normal"),
}


def get_cause_info(code: int | None) -> CauseCodeInfo:
    """Return human-readable info for a Q.850 or Cisco CUCM cause code."""
    if code is None:
        return CauseCodeInfo(-1, "Unknown", "Неизвестно", "failed")
    if code in CAUSE_CODES:
        return CAUSE_CODES[code]
    return CauseCodeInfo(code, f"Cause {code}", f"Код завершения {code}", "failed")
